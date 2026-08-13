import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { cashSessionApi, type CashHistoryParams } from '../api/cashSession.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useCancellableLatest } from '@/composables/useLatestOnly'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type {
  CashPaymentMethod,
  CashSessionView,
  CloseCashSessionRequest,
  OpenCashSessionRequest,
  RegisterCashMovementRequest,
} from '../types/caja'

/**
 * Store de Caja / arqueo. Mantiene la sesión OPEN de la sede seleccionada (con totales por método en vivo) y el
 * historial paginado. Recarga la sesión actual al cambiar de sede. Regla de recarga al abrir: las vistas/modales
 * fuerzan `loadCurrent(true)` en su montaje / al abrir.
 */
export const useCajaStore = defineStore('caja', () => {
  const current = ref<CashSessionView | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false

  const history = ref<CashSessionView[]>([])
  const historyTotal = ref(0)
  const historyPage = ref(1) // 1-based para Pagination.vue; el backend usa 0-based.
  const historyPageSize = ref(20)
  const historyTotalPages = ref(0)
  const historyLoading = ref(false)
  const historyFilters = ref<Pick<CashHistoryParams, 'branchId' | 'employeeId' | 'from' | 'to'>>({})
  const openSessions = ref<CashSessionView[]>([])
  const openSessionsLoading = ref(false)
  const openSessionsLoaded = ref(false)

  // Tres lecturas que se recargan al cambiar de sede o de filtros. Cada una
  // lleva su turno: cancela la anterior y descarta la que llegue tarde.
  const currentTurn = useCancellableLatest()
  const openSessionsTurn = useCancellableLatest()
  const historyTurn = useCancellableLatest()

  const isOpen = computed(() => current.value?.status === 'OPEN')

  /** Total esperado por método de la sesión OPEN (efectivo incluye la base). */
  const expectedByMethod = computed<Record<CashPaymentMethod, number>>(() => {
    const map: Record<CashPaymentMethod, number> = { CASH: 0, CARD: 0, TRANSFER: 0 }
    for (const t of current.value?.totals ?? []) map[t.method] = t.expectedAmount
    return map
  })

  async function loadCurrent(force = false): Promise<void> {
    if (loadedOnce && !force) return
    // Se recarga al cambiar de sede: sin guardián, la respuesta de la sede
    // anterior puede pisar la caja de la nueva.
    const turno = currentTurn.begin()
    loading.value = true
    error.value = null
    try {
      const session = await cashSessionApi.current(turno.signal)
      if (!turno.isCurrent()) return
      current.value = session
      loadedOnce = true
    } catch (e) {
      if (!turno.isCurrent()) return
      error.value = getProblemDetailMessage(e, 'No se pudo cargar la caja')
    } finally {
      if (turno.isCurrent()) loading.value = false
    }
  }

  async function open(payload: OpenCashSessionRequest): Promise<CashSessionView> {
    const session = await cashSessionApi.open(payload)
    current.value = session
    loadedOnce = true
    return session
  }

  async function addMovement(payload: RegisterCashMovementRequest): Promise<CashSessionView> {
    if (!current.value) throw new Error('No hay caja abierta')
    const session = await cashSessionApi.registerMovement(current.value.id, payload)
    current.value = session
    return session
  }

  async function close(payload: CloseCashSessionRequest): Promise<CashSessionView> {
    if (!current.value) throw new Error('No hay caja abierta')
    const session = await cashSessionApi.close(current.value.id, payload)
    current.value = null // ya no hay caja OPEN en la sede
    return session
  }

  async function loadHistory(params: CashHistoryParams = {}): Promise<void> {
    // Filtrar y paginar rápido encadena varias: solo la última debe escribir.
    const turno = historyTurn.begin()
    historyLoading.value = true
    try {
      const filterKeys = ['branchId', 'employeeId', 'from', 'to'] as const
      const nextFilters = { ...historyFilters.value }
      for (const key of filterKeys) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
          Object.assign(nextFilters, { [key]: params[key] })
        }
      }
      historyFilters.value = nextFilters
      const page = await cashSessionApi.history(
        {
          ...historyFilters.value,
          page: params.page ?? historyPage.value - 1,
          pageSize: params.pageSize ?? historyPageSize.value,
        },
        turno.signal,
      )
      if (!turno.isCurrent()) return
      history.value = page.content
      historyTotal.value = page.totalElements
      historyPage.value = page.page + 1
      historyPageSize.value = page.pageSize
      historyTotalPages.value = page.totalPages
    } catch (e) {
      if (!turno.isCurrent()) return
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el historial de cajas')
    } finally {
      if (turno.isCurrent()) historyLoading.value = false
    }
  }

  async function loadOpenSessions(): Promise<void> {
    const turno = openSessionsTurn.begin()
    openSessionsLoading.value = true
    openSessionsLoaded.value = false
    try {
      const rows = await cashSessionApi.listOpen(turno.signal)
      if (!turno.isCurrent()) return
      openSessions.value = rows
      openSessionsLoaded.value = true
    } catch (e) {
      if (!turno.isCurrent()) return
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las cajas abiertas')
    } finally {
      if (turno.isCurrent()) openSessionsLoading.value = false
    }
  }

  function setHistoryPage(page: number): Promise<void> {
    if (page === historyPage.value || page < 1 || page > historyTotalPages.value) {
      return Promise.resolve()
    }
    historyPage.value = page
    return loadHistory()
  }

  function exportArqueo(id: number, format: 'csv' | 'pdf'): Promise<void> {
    return cashSessionApi.exportArqueo(id, format)
  }

  // Multi-sucursal: al cambiar la sede seleccionada, recargar la sesión actual (si ya se había cargado).
  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      if (loadedOnce) void loadCurrent(true)
    },
  )

  return {
    current,
    loading,
    error,
    history,
    historyTotal,
    historyPage,
    historyPageSize,
    historyTotalPages,
    historyLoading,
    historyFilters,
    openSessions,
    openSessionsLoading,
    openSessionsLoaded,
    isOpen,
    expectedByMethod,
    loadCurrent,
    open,
    addMovement,
    close,
    loadHistory,
    loadOpenSessions,
    setHistoryPage,
    exportArqueo,
  }
})

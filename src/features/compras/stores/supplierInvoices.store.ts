import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supplierInvoicesApi } from '../api/supplierInvoices.api'
import type { SupplierInvoiceSearchParams } from '../types/supplierInvoices.types'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useLatestOnly } from '@/composables/useLatestOnly'
import type {
  AccountsPayableAging,
  RegisterSupplierPaymentRequest,
  SupplierInvoice,
  SupplierInvoiceRequest,
} from '../types/compras'

/**
 * Store de Facturas de proveedor / cuentas por pagar. Mantiene la página de resultados y el reporte de aging.
 * Recarga al cambiar de sede. Regla de recarga al abrir: las vistas fuerzan `search`/`loadAging` en su montaje.
 */
export const useSupplierInvoicesStore = defineStore('supplierInvoices', () => {
  const items = ref<SupplierInvoice[]>([])
  const total = ref(0)
  const loading = ref(false)
  // Filtrar rapido encadena varias busquedas: solo la ultima escribe.
  const searchTurn = useLatestOnly()
  const error = ref<string | null>(null)

  const aging = ref<AccountsPayableAging | null>(null)
  const agingLoading = ref(false)

  let lastParams: SupplierInvoiceSearchParams = {}

  async function search(params: SupplierInvoiceSearchParams = {}): Promise<void> {
    lastParams = params
    const turno = searchTurn.begin()
    loading.value = true
    error.value = null
    try {
      const page = await supplierInvoicesApi.search(params)
      if (!turno()) return
      items.value = page.content
      total.value = page.totalElements
    } catch (e) {
      if (!turno()) return
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las facturas')
    } finally {
      if (turno()) loading.value = false
    }
  }

  async function loadAging(asOf?: string): Promise<void> {
    agingLoading.value = true
    try {
      aging.value = await supplierInvoicesApi.aging(asOf)
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el reporte de cuentas por pagar')
    } finally {
      agingLoading.value = false
    }
  }

  async function create(payload: SupplierInvoiceRequest): Promise<SupplierInvoice> {
    return supplierInvoicesApi.create(payload)
  }
  async function update(id: number, payload: SupplierInvoiceRequest): Promise<SupplierInvoice> {
    return supplierInvoicesApi.update(id, payload)
  }
  async function registerPayment(
    id: number,
    payload: RegisterSupplierPaymentRequest,
  ): Promise<SupplierInvoice> {
    return supplierInvoicesApi.registerPayment(id, payload)
  }
  async function cancel(id: number): Promise<SupplierInvoice> {
    return supplierInvoicesApi.cancel(id)
  }
  async function remove(id: number): Promise<void> {
    await supplierInvoicesApi.remove(id)
  }

  // Multi-sucursal: al cambiar la sede seleccionada, recargar con los últimos filtros.
  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      if (items.value.length > 0 || loading.value) void search(lastParams)
    },
  )

  return {
    items,
    total,
    loading,
    error,
    aging,
    agingLoading,
    search,
    loadAging,
    create,
    update,
    registerPayment,
    cancel,
    remove,
  }
})

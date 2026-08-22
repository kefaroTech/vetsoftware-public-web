import { computed, ref, type Ref } from 'vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useCuentas } from './useCuentas'
import { useToast } from '@/composables/useToast'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { OpenAccountResponse, UnifiedCharge } from '../types/cuentas'

export type BillingDestino = 'existing' | 'new' | 'nada'
export type BillingCartKind = 'service' | 'product'

export interface BillingCartLine {
  kind: BillingCartKind
  id: number
  name: string
  unitPrice: number
  qty: number
}

/**
 * Marcador de idempotencia del reintento: la cuenta (destino 'new') se crea una
 * sola vez y cada cargo — un POST por unidad — se marca al persistirse, de modo
 * que tras un fallo parcial reintentar continúa sin duplicar.
 */
interface ChargeOp {
  kind: BillingCartKind
  animalId: number
  refId: number
  done: boolean
  /**
   * Key estable por unidad: se reusa en cada reintento para que el backend no
   * duplique el cargo aunque la respuesta del POST se pierda en transporte
   * (`done` queda en false y se reintenta con la misma key).
   */
  requestId: string
}

/**
 * Estado y reglas de la facturación de una consulta: destino, carrito de cargos
 * y el guardado idempotente.
 *
 * Sale entero de `ConsultaBillingModal`, que era 264 líneas de script para 237
 * de marcado. El modal se queda con el marcado y el cableado; las reglas de
 * negocio (una cuenta abierta por propietario y sede, no abrir cuenta sin
 * cargos, reintento sin duplicar) viven aquí.
 */
export function useConsultaBilling(options: {
  ownerId: Ref<number | null>
  ownerName: Ref<string>
  animalId: Ref<number | null>
}) {
  const { ownerId, ownerName, animalId } = options

  const tienda = useTienda()
  const cuentas = useCuentas()
  const toast = useToast()
  const branchStore = useBranchStore()

  const destino = ref<BillingDestino>('new')
  const existingAccount = ref<OpenAccountResponse | null>(null)
  const existingCharges = ref<UnifiedCharge[]>([])
  const loadingAccount = ref(false)
  const busy = ref(false)

  const tab = ref<BillingCartKind>('service')
  const query = ref('')
  const items = ref<BillingCartLine[]>([])

  const createdAccount = ref<OpenAccountResponse | null>(null)
  const pendingOps = ref<ChargeOp[]>([])

  const firstName = computed(() => ownerName.value.trim().split(/\s+/)[0] || ownerName.value)
  const hasAccount = computed(() => existingAccount.value !== null)

  function selectTab(nextTab: BillingCartKind) {
    tab.value = nextTab
    query.value = ''
  }

  /** Arranque del modal: limpia todo y averigua si el propietario ya tiene cuenta. */
  async function load() {
    existingAccount.value = null
    existingCharges.value = []
    items.value = []
    createdAccount.value = null
    pendingOps.value = []
    tab.value = 'service'
    query.value = ''
    destino.value = 'new'
    tienda.ensureLoaded()
    if (ownerId.value == null) return

    loadingAccount.value = true
    try {
      const acc = await cuentas.findOpenAccountByOwner(ownerId.value)
      existingAccount.value = acc
      if (acc) {
        destino.value = 'existing'
        await cuentas.loadDetail(acc.id)
        existingCharges.value = [...cuentas.charges.value]
      }
    } catch {
      existingAccount.value = null
    } finally {
      loadingAccount.value = false
    }
  }

  const catalog = computed(() => {
    const q = query.value.trim().toLowerCase()
    if (tab.value === 'service') {
      return tienda.services.value
        .filter(
          (s) =>
            !q ||
            s.name.toLowerCase().includes(q) ||
            s.serviceCategory?.name.toLowerCase().includes(q),
        )
        .map((s) => ({
          id: s.id,
          name: s.name,
          price: s.price,
          soldOut: false,
          category: s.serviceCategory?.name ?? '',
        }))
    }
    return (
      tienda.products.value
        .filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            p.productCategory?.name.toLowerCase().includes(q),
        )
        // Stock por sede (F4): agotado según el saldo de la sede activa si está
        // cargado; si no, no se marca (el backend valida).
        .map((p) => ({
          id: p.id,
          name: p.name,
          price: p.salePrice,
          soldOut: (tienda.stockByProduct.value[p.id]?.quantity ?? 1) <= 0,
          category: p.productCategory?.name ?? '',
        }))
    )
  })

  const total = computed(() => items.value.reduce((sum, l) => sum + l.unitPrice * l.qty, 0))
  const projectedSaldo = computed(
    () => (existingAccount.value?.outstandingAmount ?? 0) + total.value,
  )

  function addItem(
    kind: BillingCartKind,
    id: number,
    name: string,
    unitPrice: number,
    soldOut = false,
  ) {
    if (soldOut || busy.value) return
    const line = items.value.find((l) => l.kind === kind && l.id === id)
    if (line) line.qty += 1
    else items.value.push({ kind, id, name, unitPrice, qty: 1 })
  }

  function setQty(line: BillingCartLine, n: number) {
    const q = Math.max(0, Math.floor(n) || 0)
    if (q <= 0) items.value = items.value.filter((l) => l !== line)
    else line.qty = q
  }

  function removeLine(line: BillingCartLine) {
    items.value = items.value.filter((l) => l !== line)
  }

  const selectedHeading = computed(() =>
    destino.value === 'existing' ? 'Cargos de la cuenta' : 'Cargos de esta consulta',
  )

  const primaryLabel = computed(() => {
    // La consulta/procedimiento YA se guardó antes de abrir este modal: en 'nada'
    // el primario solo cierra → "Salir".
    if (destino.value === 'nada') return 'Salir'
    if (destino.value === 'existing') return 'Guardar y agregar a cuenta'
    return 'Guardar y abrir cuenta'
  })

  const showCharges = computed(() => destino.value === 'existing' || destino.value === 'new')

  const canConfirm = computed(() => {
    if (busy.value) return false
    if (destino.value === 'nada') return true
    if (branchStore.selectedBranchId == null) return false
    // Regla: no se abre una cuenta sin cargos → 'new' exige al menos 1 ítem.
    if (destino.value === 'new') return ownerId.value != null && items.value.length > 0
    return ownerId.value != null
  })

  /** Hubo un guardado parcial: la cuenta destino ya existe pero faltan cargos. */
  const retryHint = computed(
    () =>
      !busy.value &&
      pendingOps.value.some((o) => !o.done) &&
      (!!createdAccount.value || pendingOps.value.some((o) => o.done)),
  )

  /** Aplana el carrito a POSTs individuales (1 cargo por unidad). */
  function buildOps(): ChargeOp[] {
    const ops: ChargeOp[] = []
    if (animalId.value == null) return ops
    for (const l of items.value) {
      for (let i = 0; i < l.qty; i++) {
        ops.push({
          kind: l.kind,
          animalId: animalId.value,
          refId: l.id,
          done: false,
          requestId: crypto.randomUUID(),
        })
      }
    }
    return ops
  }

  /** @returns true si el modal debe cerrarse (éxito o destino 'nada'). */
  async function confirm(): Promise<boolean> {
    if (!canConfirm.value) return false
    if (destino.value === 'nada') return true

    busy.value = true
    try {
      // 1. Cuenta destino: 'existing' la reutiliza; 'new' la crea una sola vez.
      let accountId: number
      if (destino.value === 'existing' && existingAccount.value) {
        accountId = existingAccount.value.id
      } else {
        if (!createdAccount.value) {
          createdAccount.value = await cuentas.openAccount(ownerId.value as number)
        }
        accountId = createdAccount.value.id
      }

      // 2. Aplanar el carrito una sola vez; cada op se marca al persistirse.
      if (pendingOps.value.length === 0) pendingOps.value = buildOps()
      for (const op of pendingOps.value) {
        if (op.done) continue
        await cuentas.addChargeUnit(accountId, op.animalId, op.kind, op.refId, op.requestId)
        op.done = true
      }
      if (pendingOps.value.length > 0) await cuentas.refreshAccount(accountId)

      const units = pendingOps.value.length
      if (destino.value === 'existing') {
        toast.success(
          'Cargos agregados',
          `${units} ítem(s) sumados a la cuenta de ${firstName.value}.`,
        )
      } else {
        toast.success(
          'Cuenta abierta',
          `Se creó una cuenta para ${ownerName.value} con ${units} cargo(s).`,
        )
      }
      return true
    } catch (e) {
      // Los marcadores (createdAccount + ops.done) persisten → el reintento salta
      // lo ya guardado.
      //
      // `errorFrom` y no `error(...)` a mano: mantiene el `X-Trace-Id` de la respuesta, sin el
      // cual soporte no puede cruzar este aviso con la traza del backend (EST-02).
      toast.errorFrom('Ocurrió un error', e, 'No se pudo completar la facturación')
      return false
    } finally {
      busy.value = false
    }
  }

  return {
    destino,
    existingAccount,
    existingCharges,
    loadingAccount,
    busy,
    tab,
    query,
    items,
    catalog,
    total,
    projectedSaldo,
    firstName,
    hasAccount,
    selectedHeading,
    primaryLabel,
    showCharges,
    canConfirm,
    retryHint,
    branchStore,
    selectTab,
    load,
    addItem,
    setQty,
    removeLine,
    confirm,
  }
}

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { openAccountApi } from '../api/openAccount.api'
import { generalChargeApi, productChargeApi, serviceChargeApi } from '../api/charges.api'
import { debtOpenAccountApi } from '../api/debtOpenAccount.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useTiendaStore } from '@/features/tienda/stores/tienda.store'
import { appliesIva, splitGross } from '@/features/tienda/composables/pricing'
import type {
  CreateGeneralChargePayload,
  DebtResponse,
  OpenAccountResponse,
  PaymentMethod,
  UnifiedCharge,
} from '../types/cuentas'

/**
 * Store de Cuentas abiertas (por propietario). El total/saldo proviene del
 * backend; los cargos se agrupan por mascota en la UI.
 */
export const useCuentasStore = defineStore('cuentas', () => {
  const accounts = ref<OpenAccountResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false

  // Detalle de la cuenta seleccionada
  const charges = ref<UnifiedCharge[]>([])
  const payments = ref<DebtResponse[]>([])
  const detailLoading = ref(false)

  // Insumos del desglose fiscal de la cuenta (bruto por línea + su tasa de IVA), para el cierre.
  // product/service resuelven su tasa contra el catálogo de tienda; general trae la suya.
  const taxLines = ref<{ gross: number; ratePct: number; voided: boolean }[]>([])

  /**
   * Desglose fiscal de la cuenta (para el cierre): base gravable+exenta, IVA por tarifa y total,
   * calculado sobre los cargos NO anulados. El bruto ya incluye IVA (se extrae, no se suma).
   */
  const taxBreakdown = computed(() => {
    let base = 0
    let total = 0
    const byRate = new Map<number, number>()
    for (const l of taxLines.value) {
      if (l.voided) continue
      total += l.gross
      const { base: b, tax } = splitGross(l.gross, l.ratePct > 0, l.ratePct)
      base += b
      if (tax > 0) byRate.set(l.ratePct, (byRate.get(l.ratePct) ?? 0) + tax)
    }
    const taxRows = Array.from(byRate, ([rate, tax]) => ({ name: `IVA ${rate}%`, tax })).sort(
      (a, b) => b.tax - a.tax,
    )
    return { base, taxRows, total }
  })

  async function loadAccounts(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      accounts.value = (await openAccountApi.listAll()).filter((a) => a.enabled)
      loadedOnce = true
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar las cuentas')
    } finally {
      loading.value = false
    }
  }

  function ensureLoaded(): Promise<void> {
    return loadedOnce ? Promise.resolve() : loadAccounts()
  }

  async function loadDetail(accountId: number): Promise<void> {
    detailLoading.value = true
    try {
      const tienda = useTiendaStore()
      const [, prod, svc, gen, debts] = await Promise.all([
        // El catálogo da la tasa de IVA de product/service (el cargo no la congela).
        tienda.ensureLoaded(),
        productChargeApi.listByOpenAccount(accountId),
        serviceChargeApi.listByOpenAccount(accountId),
        generalChargeApi.listByOpenAccount(accountId),
        debtOpenAccountApi.listByOpenAccount(accountId),
      ])
      const unified: UnifiedCharge[] = []
      const lines: { gross: number; ratePct: number; voided: boolean }[] = []
      for (const c of prod.filter((x) => x.enabled)) {
        // Precio congelado al crear el cargo (snapshot del backend); no se lee del catálogo en vivo.
        // El total de la línea escala por la cantidad cobrada (unitPrice * quantity).
        const lineTotal = c.unitPrice * c.quantity
        unified.push({
          id: c.id, kind: 'product', animalId: c.animal.id, animalName: c.animal.name,
          concept: c.product.name, amount: lineTotal, quantity: c.quantity, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
        const p = tienda.products.find((x) => x.id === c.product.id)
        const rate = p && appliesIva(p.taxTreatment) ? (p.tax?.percentage ?? 0) : 0
        lines.push({ gross: lineTotal, ratePct: rate, voided: c.voided })
      }
      for (const c of svc.filter((x) => x.enabled)) {
        unified.push({
          id: c.id, kind: 'service', animalId: c.animal.id, animalName: c.animal.name,
          concept: c.service.name, amount: c.unitPrice, quantity: 1, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
        const s = tienda.services.find((x) => x.id === c.service.id)
        const rate = s && appliesIva(s.taxTreatment) ? (s.tax?.percentage ?? 0) : 0
        lines.push({ gross: c.unitPrice, ratePct: rate, voided: c.voided })
      }
      for (const c of gen.filter((x) => x.enabled)) {
        unified.push({
          id: c.id, kind: 'general', animalId: null, animalName: null,
          concept: c.name, amount: c.unitAmount * c.quantity, quantity: c.quantity, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
        const rate = c.hasTax ? (c.taxPercentage ?? c.tax?.percentage ?? 0) : 0
        lines.push({ gross: c.unitAmount * c.quantity, ratePct: rate, voided: c.voided })
      }
      charges.value = unified
      taxLines.value = lines
      // Los abonos anulados siguen enabled=true (voided=true) y deben verse tachados.
      payments.value = debts.filter((d) => d.enabled)
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el detalle de la cuenta')
    } finally {
      detailLoading.value = false
    }
  }

  function upsertAccount(acc: OpenAccountResponse): void {
    const idx = accounts.value.findIndex((a) => a.id === acc.id)
    if (idx >= 0) accounts.value.splice(idx, 1, acc)
    else accounts.value = [acc, ...accounts.value]
  }

  /**
   * Última versión optimista conocida de la cuenta (la que el front leyó por última vez). Se reenvía
   * como `expectedVersion` en las mutaciones de un solo disparo para detección temprana de conflicto.
   * `undefined` si la cuenta no está cacheada → el backend omite el chequeo (cae al optimistic lock).
   */
  function accountVersion(accountId: number): number | undefined {
    return accounts.value.find((a) => a.id === accountId)?.version
  }

  /** Mascotas distintas referenciadas en los cargos de la cuenta seleccionada. */
  const petsInCharges = computed(() => {
    const map = new Map<number, string>()
    for (const c of charges.value) {
      if (c.animalId != null && c.animalName) map.set(c.animalId, c.animalName)
    }
    return Array.from(map, ([id, name]) => ({ id, name }))
  })

  /** Cargos agrupados por mascota; "General" al final. */
  const chargesByPet = computed(() => {
    const groups = new Map<number | 'general', { key: number | 'general'; name: string; charges: UnifiedCharge[]; subtotal: number }>()
    for (const c of charges.value) {
      const key = c.animalId ?? ('general' as const)
      const name = c.animalName ?? 'General'
      if (!groups.has(key)) groups.set(key, { key, name, charges: [], subtotal: 0 })
      const g = groups.get(key)!
      g.charges.push(c)
      // Los cargos anulados se muestran (tachados) pero no cuentan en el subtotal ni en el total.
      if (!c.voided) g.subtotal += c.amount
    }
    const arr = Array.from(groups.values())
    arr.sort((a, b) => (a.key === 'general' ? 1 : b.key === 'general' ? -1 : 0))
    return arr
  })

  async function findOpenAccountByOwner(ownerId: number): Promise<OpenAccountResponse | null> {
    // "Cuenta abierta" = status === 'OPEN'. Una cuenta cerrada/cancelada sigue
    // enabled=true pero ya no es abierta, así que no debe bloquear abrir otra.
    const local = accounts.value.find(
      (a) => a.owner.id === ownerId && a.enabled && a.status === 'OPEN',
    )
    if (local) return local
    const res = await openAccountApi.search({ ownerId, enabled: true, page: 0, pageSize: 20 })
    return res.content.find((a) => a.status === 'OPEN') ?? null
  }

  /**
   * Get-or-create de la cuenta abierta del propietario (regla: UNA por dueño). Si ya existe
   * —incluida una cuenta vacía dejada por un intento fallido— se reutiliza en vez de fallar;
   * si no, se crea. El backend es idempotente por ownerId del mismo modo, así que un reintento
   * tras perder la respuesta no duplica ni choca con 409. La UX que impide abrir una segunda
   * cuenta vive en el modal (aviso de duplicado al elegir propietario), no aquí.
   */
  async function openAccount(ownerId: number): Promise<OpenAccountResponse> {
    const existing = await findOpenAccountByOwner(ownerId)
    if (existing) {
      upsertAccount(existing)
      return existing
    }
    const created = await openAccountApi.create(ownerId)
    upsertAccount(created)
    return created
  }

  async function refreshAccount(accountId: number) {
    const fresh = await openAccountApi.findById(accountId)
    upsertAccount(fresh)
    await loadDetail(accountId)
  }

  async function addProductCharge(
    accountId: number,
    animalId: number,
    productId: number,
    quantity = 1,
    clientRequestId?: string,
  ) {
    await productChargeApi.create({
      animalId, productId, openAccountId: accountId, quantity, clientRequestId,
      expectedVersion: accountVersion(accountId),
    })
    await refreshAccount(accountId)
  }
  async function addServiceCharge(accountId: number, animalId: number, serviceId: number, clientRequestId?: string) {
    await serviceChargeApi.create({
      animalId, serviceId, openAccountId: accountId, clientRequestId,
      expectedVersion: accountVersion(accountId),
    })
    await refreshAccount(accountId)
  }
  async function addGeneralCharge(payload: CreateGeneralChargePayload) {
    await generalChargeApi.create({
      ...payload,
      expectedVersion: payload.expectedVersion ?? accountVersion(payload.openAccountId),
    })
    await refreshAccount(payload.openAccountId)
  }

  /**
   * Crea UN cargo de producto/servicio (1 unidad) sin refrescar la cuenta. Pensado para
   * flujos que orquestan varios POST con marcadores de idempotencia y refrescan al final
   * (ver OpenAccountModal). Para uso normal preferir addProductCharge/addServiceCharge.
   */
  async function addChargeUnit(
    accountId: number,
    animalId: number,
    kind: 'service' | 'product',
    refId: number,
    clientRequestId?: string,
  ): Promise<void> {
    if (kind === 'service') {
      await serviceChargeApi.create({ animalId, serviceId: refId, openAccountId: accountId, clientRequestId })
    } else {
      await productChargeApi.create({ animalId, productId: refId, openAccountId: accountId, clientRequestId })
    }
  }

  /** Crea un cargo general sin refrescar la cuenta (el caller refresca al final). */
  async function addGeneralChargeNoRefresh(payload: CreateGeneralChargePayload): Promise<void> {
    await generalChargeApi.create(payload)
  }

  /**
   * Agrega varios cargos de producto/servicio a una cuenta en una sola pasada
   * (un cargo por unidad de `qty`) y refresca la cuenta una sola vez al final.
   */
  async function addChargesBatch(
    accountId: number,
    animalId: number,
    items: { kind: 'service' | 'product'; id: number; qty: number }[],
  ): Promise<void> {
    for (const it of items) {
      for (let i = 0; i < it.qty; i++) {
        // Idempotency key por unidad: protege reintentos de transporte de duplicar el cargo en el backend.
        if (it.kind === 'service') {
          await serviceChargeApi.create({ animalId, serviceId: it.id, openAccountId: accountId, clientRequestId: crypto.randomUUID() })
        } else {
          await productChargeApi.create({ animalId, productId: it.id, openAccountId: accountId, clientRequestId: crypto.randomUUID() })
        }
      }
    }
    await refreshAccount(accountId)
  }

  async function addPayment(
    accountId: number,
    amount: number,
    paymentMethod: PaymentMethod,
    clientRequestId?: string,
  ) {
    await debtOpenAccountApi.create({
      amount, paymentMethod, openAccountId: accountId, clientRequestId,
      expectedVersion: accountVersion(accountId),
    })
    await refreshAccount(accountId)
  }

  /**
   * Registra un abono SIN refrescar la cuenta. Pensado para el cierre cobrado, que
   * orquesta abono + cambio de estado con un marcador de idempotencia en el modal
   * (ver CloseAccountModal) y refresca al final. Para abonos normales usar addPayment.
   */
  async function addPaymentNoRefresh(
    accountId: number,
    amount: number,
    paymentMethod: PaymentMethod,
    clientRequestId?: string,
  ): Promise<void> {
    await debtOpenAccountApi.create({ amount, paymentMethod, openAccountId: accountId, clientRequestId })
  }

  /**
   * Cambia el estado de la cuenta a CLOSE (cobrada) o CANCEL (cancelada) y refleja la
   * cuenta actualizada en la lista. El backend exige saldo cero para CLOSE, así que el
   * abono del saldo debe registrarse antes (ver addPaymentNoRefresh + CloseAccountModal).
   */
  async function changeAccountStatus(
    accountId: number,
    status: 'CLOSE' | 'CANCEL',
    reason?: string,
    // Al CERRAR (CLOSE) dispara la auto-emisión del documento DIAN (best-effort en el backend).
    documentType?: 'FE_VENTA' | 'DOC_EQUIV_POS',
    finalConsumer?: boolean,
    // Detección temprana de conflicto (opt-in): envía la versión cacheada como expectedVersion. Debe ser
    // `false` cuando justo antes se registró un abono SIN refrescar (cierre cobrado): esa versión cacheada
    // quedó vieja y dispararía un 409 falso; ahí el optimistic lock del backend al flush sigue protegiendo.
    checkConflict = true,
  ): Promise<OpenAccountResponse> {
    const updated = await openAccountApi.changeStatus(
      accountId,
      status,
      reason,
      documentType,
      finalConsumer,
      checkConflict ? accountVersion(accountId) : undefined,
    )
    upsertAccount(updated)
    return updated
  }

  /**
   * Anula un abono mal registrado con un motivo obligatorio (permiso elevado
   * debtOpenAccount.delete). Solo permitido con la cuenta OPEN. El abono no se borra:
   * queda visible tachado y deja de contar en el saldo. Refresca cuenta + detalle.
   */
  async function voidPayment(accountId: number, debtId: number, reason: string) {
    await debtOpenAccountApi.voidPayment(debtId, reason, accountVersion(accountId))
    await refreshAccount(accountId)
  }

  /**
   * Anula un cargo mal registrado con un motivo obligatorio (permiso elevado
   * chargeOpenAccount.delete). Solo permitido con la cuenta OPEN. El cargo no se borra:
   * queda visible tachado y deja de contar en el total. Refresca cuenta + detalle.
   */
  async function voidCharge(accountId: number, charge: UnifiedCharge, reason: string) {
    const ev = accountVersion(accountId)
    if (charge.kind === 'product') await productChargeApi.voidCharge(charge.id, reason, ev)
    else if (charge.kind === 'service') await serviceChargeApi.voidCharge(charge.id, reason, ev)
    else await generalChargeApi.voidCharge(charge.id, reason, ev)
    await refreshAccount(accountId)
  }

  return {
    accounts,
    loading,
    error,
    charges,
    payments,
    detailLoading,
    taxBreakdown,
    petsInCharges,
    chargesByPet,
    ensureLoaded,
    loadAccounts,
    loadDetail,
    refreshAccount,
    findOpenAccountByOwner,
    openAccount,
    addProductCharge,
    addServiceCharge,
    addGeneralCharge,
    addChargeUnit,
    addGeneralChargeNoRefresh,
    addChargesBatch,
    addPayment,
    addPaymentNoRefresh,
    changeAccountStatus,
    voidPayment,
    voidCharge,
  }
})

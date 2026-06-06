import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { openAccountApi } from '../api/openAccount.api'
import { generalChargeApi, productChargeApi, serviceChargeApi } from '../api/charges.api'
import { debtOpenAccountApi } from '../api/debtOpenAccount.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
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
      const [prod, svc, gen, debts] = await Promise.all([
        productChargeApi.listByOpenAccount(accountId),
        serviceChargeApi.listByOpenAccount(accountId),
        generalChargeApi.listByOpenAccount(accountId),
        debtOpenAccountApi.listByOpenAccount(accountId),
      ])
      const unified: UnifiedCharge[] = []
      for (const c of prod.filter((x) => x.enabled)) {
        // Precio congelado al crear el cargo (snapshot del backend); no se lee del catálogo en vivo.
        unified.push({
          id: c.id, kind: 'product', animalId: c.animal.id, animalName: c.animal.name,
          concept: c.product.name, amount: c.unitPrice, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
      }
      for (const c of svc.filter((x) => x.enabled)) {
        unified.push({
          id: c.id, kind: 'service', animalId: c.animal.id, animalName: c.animal.name,
          concept: c.service.name, amount: c.unitPrice, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
      }
      for (const c of gen.filter((x) => x.enabled)) {
        unified.push({
          id: c.id, kind: 'general', animalId: null, animalName: null,
          concept: c.name, amount: c.unitAmount * c.quantity, date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided, voidedByName: c.voidedBy?.name ?? '', voidReason: c.voidReason ?? '',
        })
      }
      charges.value = unified
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
   * Abre una cuenta para el propietario. Regla de negocio: un propietario solo
   * puede tener UNA cuenta abierta a la vez — si ya tiene una, se rechaza
   * (también enforzado en el backend con 409 OWNER_ALREADY_HAS_OPEN_ACCOUNT).
   */
  async function openAccount(ownerId: number): Promise<OpenAccountResponse> {
    const existing = await findOpenAccountByOwner(ownerId)
    if (existing) throw new Error('Este propietario ya tiene una cuenta abierta.')
    const created = await openAccountApi.create(ownerId)
    upsertAccount(created)
    return created
  }

  async function refreshAccount(accountId: number) {
    const fresh = await openAccountApi.findById(accountId)
    upsertAccount(fresh)
    await loadDetail(accountId)
  }

  async function addProductCharge(accountId: number, animalId: number, productId: number) {
    await productChargeApi.create({ animalId, productId, openAccountId: accountId })
    await refreshAccount(accountId)
  }
  async function addServiceCharge(accountId: number, animalId: number, serviceId: number) {
    await serviceChargeApi.create({ animalId, serviceId, openAccountId: accountId })
    await refreshAccount(accountId)
  }
  async function addGeneralCharge(payload: CreateGeneralChargePayload) {
    await generalChargeApi.create(payload)
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
  ): Promise<void> {
    if (kind === 'service') {
      await serviceChargeApi.create({ animalId, serviceId: refId, openAccountId: accountId })
    } else {
      await productChargeApi.create({ animalId, productId: refId, openAccountId: accountId })
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
        if (it.kind === 'service') {
          await serviceChargeApi.create({ animalId, serviceId: it.id, openAccountId: accountId })
        } else {
          await productChargeApi.create({ animalId, productId: it.id, openAccountId: accountId })
        }
      }
    }
    await refreshAccount(accountId)
  }

  async function addPayment(accountId: number, amount: number, paymentMethod: PaymentMethod) {
    await debtOpenAccountApi.create({ amount, paymentMethod, openAccountId: accountId })
    await refreshAccount(accountId)
  }

  /**
   * Cierra una cuenta. Si el motivo es COBRADA y hay saldo pendiente, registra
   * primero el abono del saldo restante; luego cambia el estado de la cuenta a
   * CLOSE (cobrada) o CANCEL (cancelada). Devuelve la cuenta actualizada.
   */
  async function closeAccount(
    accountId: number,
    opts: {
      motivo: 'COBRADA' | 'CANCELADA'
      paymentMethod: PaymentMethod
      outstanding: number
      reason?: string
    },
  ): Promise<OpenAccountResponse> {
    if (opts.motivo === 'COBRADA' && opts.outstanding > 0) {
      await debtOpenAccountApi.create({
        amount: opts.outstanding,
        paymentMethod: opts.paymentMethod,
        openAccountId: accountId,
      })
    }
    const updated = await openAccountApi.changeStatus(
      accountId,
      opts.motivo === 'CANCELADA' ? 'CANCEL' : 'CLOSE',
      opts.motivo === 'CANCELADA' ? opts.reason : undefined,
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
    await debtOpenAccountApi.voidPayment(debtId, reason)
    await refreshAccount(accountId)
  }

  /**
   * Anula un cargo mal registrado con un motivo obligatorio (permiso elevado
   * chargeOpenAccount.delete). Solo permitido con la cuenta OPEN. El cargo no se borra:
   * queda visible tachado y deja de contar en el total. Refresca cuenta + detalle.
   */
  async function voidCharge(accountId: number, charge: UnifiedCharge, reason: string) {
    if (charge.kind === 'product') await productChargeApi.voidCharge(charge.id, reason)
    else if (charge.kind === 'service') await serviceChargeApi.voidCharge(charge.id, reason)
    else await generalChargeApi.voidCharge(charge.id, reason)
    await refreshAccount(accountId)
  }

  async function removeCharge(accountId: number, charge: UnifiedCharge) {
    if (charge.kind === 'product') await productChargeApi.remove(charge.id)
    else if (charge.kind === 'service') await serviceChargeApi.remove(charge.id)
    else await generalChargeApi.remove(charge.id)
    await refreshAccount(accountId)
  }

  return {
    accounts,
    loading,
    error,
    charges,
    payments,
    detailLoading,
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
    closeAccount,
    voidPayment,
    voidCharge,
    removeCharge,
  }
})

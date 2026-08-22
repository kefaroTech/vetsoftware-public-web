import type { PageResponse } from '@/types/pagination'
import axios from 'axios'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { openAccountApi } from '../api/openAccount.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { generalChargeApi, productChargeApi, serviceChargeApi } from '../api/charges.api'
import { debtOpenAccountApi } from '../api/debtOpenAccount.api'
import { useCancellableLatest, useLatestOnly } from '@/composables/useLatestOnly'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useTiendaStore } from '@/features/tienda/stores/tienda.store'
import { appliesIva, splitGross, taxByRate } from '@/features/tienda/composables/pricing'
import { sum as sumMoney } from '@/features/tienda/composables/money'
import type {
  CreateGeneralChargePayload,
  DebtResponse,
  OpenAccountResponse,
  OpenAccountSearchCriteria,
  OpenAccountsSummary,
  PaymentMethod,
  UnifiedCharge,
} from '../types/cuentas'

/**
 * Una unidad a cobrar en `addChargesBatch`, con SU clave de idempotencia ya decidida.
 *
 * La clave es parte del dato y no un extra opcional a propósito: así no se puede añadir una
 * unidad al lote sin decir a qué intento del usuario pertenece, que es justo lo que se perdía
 * cuando el lote las fabricaba por su cuenta en cada pasada (#203).
 */
export interface BatchChargeUnit {
  kind: 'service' | 'product'
  /** id del servicio o del producto del catálogo. */
  refId: number
  /** UUID generado UNA vez por el intento lógico del usuario y reusado en sus reintentos. */
  clientRequestId: string
}

/**
 * Store de Cuentas abiertas (por propietario y sede). El total/saldo proviene del
 * backend; los cargos se agrupan por mascota en la UI.
 */
export const useCuentasStore = defineStore('cuentas', () => {
  /**
   * Cuentas que el usuario ya tocó en esta sesión (creadas, refrescadas tras un cargo o un
   * cierre). BE-06: dejó de ser "la lista" — de eso se encarga la paginación servida de la
   * pantalla — y quedó como caché para resolver la versión optimista y el get-or-create sin
   * volver a preguntar al backend.
   */
  const accounts = ref<OpenAccountResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /** Contadores de pestaña y saldo pendiente: el servidor los calcula sobre TODAS las cuentas. */
  const summary = ref<OpenAccountsSummary>({ openCount: 0, closedCount: 0, totalOutstanding: 0 })
  // El resumen se recarga al cambiar de sede: solo la ultima respuesta escribe.
  const summaryTurn = useLatestOnly()

  // Detalle de la cuenta seleccionada
  const charges = ref<UnifiedCharge[]>([])
  const payments = ref<DebtResponse[]>([])
  const detailLoading = ref(false)
  // El detalle se recarga por id de cuenta: solo la ultima seleccion escribe.
  const detailTurn = useCancellableLatest()

  // Insumos del desglose fiscal de la cuenta (bruto por línea + su tasa de IVA), para el cierre.
  // product/service resuelven su tasa contra el catálogo de tienda; general trae la suya.
  const taxLines = ref<{ gross: number; ratePct: number; voided: boolean }[]>([])

  /**
   * Desglose fiscal de la cuenta (para el cierre): base gravable+exenta, IVA por tarifa y total,
   * calculado sobre los cargos NO anulados. El bruto ya incluye IVA (se extrae, no se suma).
   */
  const taxBreakdown = computed(() => {
    const vigentes = taxLines.value.filter((l) => !l.voided)
    const total = sumMoney(vigentes.map((l) => l.gross))
    const base = sumMoney(vigentes.map((l) => splitGross(l.gross, l.ratePct > 0, l.ratePct).base))
    // El agrupado por tarifa lo hace `pricing`: el POS calculaba exactamente lo
    // mismo con su propio bucle, y dos copias de una regla fiscal es una de más.
    const taxRows = taxByRate(vigentes)
      .map((r) => ({ name: r.name, tax: r.amount }))
      .sort((a, b) => b.tax - a.tax)
    return { base, taxRows, total }
  })

  /**
   * Una página de cuentas según los criterios de la pantalla. La pestaña y el buscador son
   * `statuses` y `q`: se resuelven en el servidor porque con la lista paginada un filtro de
   * cliente solo vería lo ya cargado (BE-06).
   */
  function searchPage(
    criteria: OpenAccountSearchCriteria,
    signal?: AbortSignal,
  ): Promise<PageResponse<OpenAccountResponse>> {
    // Lectura de fondo: la pantalla pinta su propio esqueleto (EST-05) y no
    // quiere el velo global encima.
    return openAccountApi.search({ enabled: true, ...criteria }, signal, true)
  }

  /** Contadores de las pestañas y saldo pendiente acumulado, calculados en el servidor. */
  async function loadSummary(): Promise<void> {
    const turno = summaryTurn.begin()
    try {
      const fresh = await openAccountApi.summary(true)
      if (!turno()) return
      summary.value = fresh
    } catch (e) {
      if (!turno()) return
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los totales de cuentas')
    }
  }

  // Multi-sucursal: los totales son por sede, así que cambiarla los invalida. La lista la
  // recarga la propia pantalla (tiene el estado de la paginación).
  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      accounts.value = []
      void loadSummary()
    },
  )

  async function loadDetail(accountId: number): Promise<void> {
    // Saltar de una cuenta a otra deja dos detalles en vuelo: sin esto, los
    // cargos de la cuenta anterior pueden pisar los de la que se está viendo.
    //
    // Aquí el turno solo descarta, no cancela: el `Promise.all` incluye
    // `tienda.ensureLoaded()`, que es una promesa compartida del catálogo.
    // Abortarla dejaría sin catálogo a todo el que la estuviera esperando.
    const turno = detailTurn.begin()
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
          id: c.id,
          kind: 'product',
          animalId: c.animal.id,
          animalName: c.animal.name,
          concept: c.product.name,
          amount: lineTotal,
          quantity: c.quantity,
          date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided,
          voidedByName: c.voidedBy?.name ?? '',
          voidReason: c.voidReason ?? '',
        })
        const p = tienda.products.find((x) => x.id === c.product.id)
        const rate = p && appliesIva(p.taxTreatment) ? (p.tax?.percentage ?? 0) : 0
        lines.push({ gross: lineTotal, ratePct: rate, voided: c.voided })
      }
      for (const c of svc.filter((x) => x.enabled)) {
        unified.push({
          id: c.id,
          kind: 'service',
          animalId: c.animal.id,
          animalName: c.animal.name,
          concept: c.service.name,
          amount: c.unitPrice,
          quantity: 1,
          date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided,
          voidedByName: c.voidedBy?.name ?? '',
          voidReason: c.voidReason ?? '',
        })
        const s = tienda.services.find((x) => x.id === c.service.id)
        const rate = s && appliesIva(s.taxTreatment) ? (s.tax?.percentage ?? 0) : 0
        lines.push({ gross: c.unitPrice, ratePct: rate, voided: c.voided })
      }
      for (const c of gen.filter((x) => x.enabled)) {
        unified.push({
          id: c.id,
          kind: 'general',
          animalId: null,
          animalName: null,
          concept: c.name,
          amount: c.unitAmount * c.quantity,
          quantity: c.quantity,
          date: c.createdDate,
          createdByName: c.createdBy?.name ?? '',
          voided: c.voided,
          voidedByName: c.voidedBy?.name ?? '',
          voidReason: c.voidReason ?? '',
        })
        const rate = c.hasTax ? (c.taxPercentage ?? c.tax?.percentage ?? 0) : 0
        lines.push({ gross: c.unitAmount * c.quantity, ratePct: rate, voided: c.voided })
      }
      if (!turno.isCurrent()) return
      charges.value = unified
      taxLines.value = lines
      // Los abonos anulados siguen enabled=true (voided=true) y deben verse tachados.
      payments.value = debts.filter((d) => d.enabled)
    } catch (e) {
      if (!turno.isCurrent()) return
      error.value = getProblemDetailMessage(e, 'No se pudo cargar el detalle de la cuenta')
    } finally {
      if (turno.isCurrent()) detailLoading.value = false
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
    const groups = new Map<
      number | 'general',
      { key: number | 'general'; name: string; charges: UnifiedCharge[]; subtotal: number }
    >()
    for (const c of charges.value) {
      const key = c.animalId ?? ('general' as const)
      const name = c.animalName ?? 'General'
      let g = groups.get(key)
      if (!g) {
        g = { key, name, charges: [], subtotal: 0 }
        groups.set(key, g)
      }
      g.charges.push(c)
      // Los cargos anulados se muestran (tachados) pero no cuentan en el subtotal ni en el total.
      if (!c.voided) g.subtotal += c.amount
    }
    const arr = Array.from(groups.values())
    arr.sort((a, b) => (a.key === 'general' ? 1 : b.key === 'general' ? -1 : 0))
    return arr
  })

  async function findOpenAccountByOwner(ownerId: number): Promise<OpenAccountResponse | null> {
    // `ensureSelectedBranch()` y no leer `selectedBranchId` a secas: la sede se resuelve en el
    // store de sedes, pero es una petición, y quien entra aquí lo bastante pronto (enlace
    // directo, F5 sobre el detalle) la pillaba todavía en null y se comía este error sin que
    // faltara sede ninguna (issue #201). Si tras resolver sigue sin haberla, el mensaje es real.
    if ((await useBranchStore().ensureSelectedBranch()) == null) {
      throw new Error('Selecciona una sede para consultar la cuenta abierta del propietario.')
    }
    // "Cuenta abierta" = status === 'OPEN'. Una cuenta cerrada/cancelada sigue
    // enabled=true pero ya no es abierta, así que no debe bloquear abrir otra.
    const local = accounts.value.find(
      (a) => a.owner.id === ownerId && a.enabled && a.status === 'OPEN',
    )
    if (local) return local
    // El estado ya lo filtra el servidor (BE-06): se pide la abierta, no las 20 primeras.
    const res = await openAccountApi.search({
      ownerId,
      enabled: true,
      statuses: ['OPEN'],
      page: 0,
      pageSize: 1,
    })
    return res.content[0] ?? null
  }

  /**
   * Get-or-create de la cuenta abierta del propietario (regla: UNA por dueño). Si ya existe
   * —incluida una cuenta vacía dejada por un intento fallido— se reutiliza en vez de fallar;
   * si no, se crea. El backend es idempotente por ownerId del mismo modo, así que un reintento
   * tras perder la respuesta no duplica ni choca con 409. La UX que impide abrir una segunda
   * cuenta vive en el modal (aviso de duplicado al elegir propietario), no aquí.
   */
  async function openAccount(ownerId: number): Promise<OpenAccountResponse> {
    // Misma razón que en `findOpenAccountByOwner`: se espera a que la sede esté resuelta antes
    // de declarar que no hay.
    if ((await useBranchStore().ensureSelectedBranch()) == null) {
      throw new Error('Selecciona una sede antes de abrir una cuenta.')
    }
    const existing = await findOpenAccountByOwner(ownerId)
    if (existing) {
      upsertAccount(existing)
      return existing
    }
    const created = await openAccountApi.create(ownerId)
    upsertAccount(created)
    return created
  }

  /**
   * Resuelve una cuenta por id, para entrar al detalle por URL.
   *
   * Con el detalle en la ruta (EST-08) un `accountId` puede llegar de un enlace
   * pegado, de un marcador viejo o de un F5 sobre una cuenta que entretanto se
   * borró o es de otra empresa. Eso antes era imposible —siempre se llegaba
   * pinchando una tarjeta que ya estaba en pantalla— y ahora es un camino
   * normal, así que «no existe» tiene que ser un resultado, no una excepción que
   * deje la pantalla en blanco.
   *
   * @returns la cuenta, o `null` si el servidor dice que no existe o no es
   *          visible para este usuario (404/403). Cualquier otro fallo se
   *          propaga: un 500 o una caída de red no son «no existe».
   */
  async function fetchAccount(accountId: number): Promise<OpenAccountResponse | null> {
    try {
      const fresh = await openAccountApi.findById(accountId)
      upsertAccount(fresh)
      return fresh
    } catch (e) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined
      if (status === 404 || status === 403) return null
      throw e
    }
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
      animalId,
      productId,
      openAccountId: accountId,
      quantity,
      clientRequestId,
      expectedVersion: accountVersion(accountId),
    })
    await refreshAccount(accountId)
  }
  async function addServiceCharge(
    accountId: number,
    animalId: number,
    serviceId: number,
    clientRequestId?: string,
  ) {
    await serviceChargeApi.create({
      animalId,
      serviceId,
      openAccountId: accountId,
      clientRequestId,
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
      await serviceChargeApi.create({
        animalId,
        serviceId: refId,
        openAccountId: accountId,
        clientRequestId,
      })
    } else {
      await productChargeApi.create({
        animalId,
        productId: refId,
        openAccountId: accountId,
        clientRequestId,
      })
    }
  }

  /** Crea un cargo general sin refrescar la cuenta (el caller refresca al final). */
  async function addGeneralChargeNoRefresh(payload: CreateGeneralChargePayload): Promise<void> {
    await generalChargeApi.create(payload)
  }

  /**
   * Agrega varios cargos de producto/servicio a una cuenta en una sola pasada (un cargo por
   * unidad, ya aplanada) y refresca la cuenta una sola vez al final.
   *
   * Las claves de idempotencia NO se generan aquí: llegan con cada unidad. Generarlas dentro
   * del bucle era el defecto #203 — el store no sabe cuándo empieza un intento lógico del
   * usuario (eso solo lo sabe quien lo orquesta), así que cada reintento estrenaba clave, el
   * backend veía peticiones nuevas y volvía a crear los cargos que ya existían: la red fallaba
   * a mitad, el usuario reintentaba y la cuenta acababa con los productos cobrados dos veces.
   * El llamador aplana su carrito UNA vez con una clave por unidad y reintenta con las mismas
   * (patrón `buildOps` de `useOpenAccountCart` y `useConsultaBilling`); reenviar una clave ya
   * usada devuelve el cargo existente en vez de crear otro.
   */
  async function addChargesBatch(
    accountId: number,
    animalId: number,
    units: BatchChargeUnit[],
  ): Promise<void> {
    for (const unit of units) {
      await addChargeUnit(accountId, animalId, unit.kind, unit.refId, unit.clientRequestId)
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
      amount,
      paymentMethod,
      openAccountId: accountId,
      clientRequestId,
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
    await debtOpenAccountApi.create({
      amount,
      paymentMethod,
      openAccountId: accountId,
      clientRequestId,
    })
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
    summary,
    charges,
    payments,
    detailLoading,
    taxBreakdown,
    petsInCharges,
    chargesByPet,
    searchPage,
    loadSummary,
    loadDetail,
    fetchAccount,
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

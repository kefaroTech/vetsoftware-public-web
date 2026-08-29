import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { cobrosApi } from '../api/cobros.api'
import { isForbidden } from '../composables/accesoBloqueado'
import type {
  BillingDocumentResponse,
  CustomerCreditBalanceResponse,
  DunningEventResponse,
  SubscriptionChargeResponse,
} from '../types/cobros.types'

/**
 * Saldo a favor, avisos de cobranza y la ficha de una cuenta de cobro.
 *
 * <p>Los listados paginados (documentos, pagos) los sirve `useServerPaged` desde su vista: es
 * estado **por instancia de pantalla**, no compartido, y ese es el patrón del repositorio para
 * tablas. Aquí vive lo que sí comparten varias piezas.
 *
 * <p>Nada de esto escribe. `POST /subscription-payments` es de plataforma: **la clínica no
 * registra su propio pago**, y la pantalla lo dice en vez de esconderlo.
 */
export const useCobrosStore = defineStore('suscripcionCobros', () => {
  const creditBalance = ref<CustomerCreditBalanceResponse | null>(null)
  const creditForbidden = ref(false)

  const dunningEvents = ref<DunningEventResponse[]>([])
  const dunningForbidden = ref(false)
  const dunningLoaded = ref(false)

  const document = ref<BillingDocumentResponse | null>(null)
  const charges = ref<SubscriptionChargeResponse[]>([])
  /** El desglose puede estar incompleto: se dice, no se da por bueno. Ver `cobros.api.ts`. */
  const chargesTruncated = ref(false)
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)
  const detailErrorTraceId = ref<string | null>(null)
  const detailForbidden = ref(false)

  /** Saldo a favor. Sin `customerCredit.read` la tarjeta no se pinta; el resto sí. */
  async function loadCreditBalance(): Promise<void> {
    creditForbidden.value = false
    try {
      creditBalance.value = await cobrosApi.findCreditBalance()
    } catch (e: unknown) {
      creditBalance.value = null
      if (isForbidden(e)) creditForbidden.value = true
    }
  }

  /** Avisos de cobranza. Bloque plegado y opcional por diseño. */
  async function loadDunning(subscriptionId: number): Promise<void> {
    dunningForbidden.value = false
    try {
      const page = await cobrosApi.listBySubscription(subscriptionId)
      dunningEvents.value = page.content
    } catch (e: unknown) {
      dunningEvents.value = []
      if (isForbidden(e)) dunningForbidden.value = true
    } finally {
      dunningLoaded.value = true
    }
  }

  async function loadDocument(id: number): Promise<void> {
    detailLoading.value = true
    detailError.value = null
    detailErrorTraceId.value = null
    detailForbidden.value = false
    document.value = null
    charges.value = []
    chargesTruncated.value = false
    try {
      const doc = await cobrosApi.findById(id)
      document.value = doc
      const resultado = await cobrosApi.listChargesByDocument(doc.id, doc.subscriptionId)
      charges.value = resultado.charges
      chargesTruncated.value = resultado.truncated
    } catch (e: unknown) {
      if (isForbidden(e)) {
        detailForbidden.value = true
      } else {
        detailError.value = getProblemDetailMessage(e, 'No se pudo cargar esta cuenta de cobro')
        detailErrorTraceId.value = getTraceId(e) ?? null
      }
    } finally {
      detailLoading.value = false
    }
  }

  return {
    creditBalance,
    creditForbidden,
    dunningEvents,
    dunningForbidden,
    dunningLoaded,
    document,
    charges,
    chargesTruncated,
    detailLoading,
    detailError,
    detailErrorTraceId,
    detailForbidden,
    loadCreditBalance,
    loadDunning,
    loadDocument,
  }
})

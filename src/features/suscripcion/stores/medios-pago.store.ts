import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { mediosPagoApi } from '../api/medios-pago.api'
import { isForbidden } from '../composables/accesoBloqueado'
import type {
  RegisterSubscriptionPaymentMethodRequest,
  SubscriptionPaymentMethodResponse,
} from '../types/medios-pago.types'

export const useMediosPagoStore = defineStore('suscripcionMediosPago', () => {
  const methods = ref<SubscriptionPaymentMethodResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)
  const forbidden = ref(false)
  /** Lo último que se anunció en la región invisible tras hacer predeterminado un medio. */
  const anuncio = ref('')

  const activos = computed(() => methods.value.filter((m) => m.mandateStatus === 'ACTIVE'))

  let inFlight: Promise<void> | null = null

  async function cargar(): Promise<void> {
    error.value = null
    errorTraceId.value = null
    forbidden.value = false
    loading.value = true
    try {
      const page = await mediosPagoApi.listAll()
      methods.value = page.content
    } catch (e: unknown) {
      methods.value = []
      if (isForbidden(e)) {
        forbidden.value = true
      } else {
        error.value = getProblemDetailMessage(e, 'No se pudieron cargar tus medios de pago')
        errorTraceId.value = getTraceId(e) ?? null
      }
    } finally {
      loading.value = false
    }
  }

  async function load(force = false): Promise<void> {
    if (inFlight) return inFlight
    if (!force && methods.value.length > 0) return
    inFlight = cargar().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  /** `PATCH /{id}/default`, sin cuerpo. Repinta la lista: la evidencia queda en pantalla. */
  async function setDefault(id: number): Promise<void> {
    await mediosPagoApi.setDefault(id)
    await cargar()
  }

  async function revoke(id: number, reason: string): Promise<void> {
    await mediosPagoApi.revoke(id, { reason })
    await cargar()
  }

  /**
   * **Escrita y sin pantalla que la llame todavía**, a propósito: el endpoint exige un `token`
   * de pasarela y este front no tiene widget de tokenización. Cuando lo haya, el hueco honesto
   * de la vista se sustituye por el formulario y esta acción ya está.
   */
  async function create(payload: RegisterSubscriptionPaymentMethodRequest): Promise<void> {
    await mediosPagoApi.create(payload)
    await cargar()
  }

  function anunciar(texto: string) {
    anuncio.value = texto
  }

  return {
    methods,
    activos,
    loading,
    error,
    errorTraceId,
    forbidden,
    anuncio,
    load,
    setDefault,
    revoke,
    create,
    anunciar,
  }
})

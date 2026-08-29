import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { suscripcionApi } from '../api/suscripcion.api'
import { isForbidden, isNotFound } from '../composables/accesoBloqueado'
import type { SubscriptionItemResponse, SubscriptionResponse } from '../types/suscripcion.types'

/**
 * El plan vigente y sus líneas.
 *
 * <p>Es un store de Pinia y no un `ref()` a nivel de módulo dentro del composable, que es lo que
 * la regla del proyecto prohíbe. Aquí el motivo no es formal: el banner de estado lo consumen
 * las cinco sub-pantallas, y un singleton de módulo lo compartiría también **entre dos sesiones
 * distintas en la misma pestaña** tras un cambio de usuario — la clínica de quien entra
 * segundo vería el estado de plan de quien entró primero.
 */
export const useSuscripcionStore = defineStore('suscripcion', () => {
  const subscription = ref<SubscriptionResponse | null>(null)
  const items = ref<SubscriptionItemResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)
  /** 403: el rol no incluye `subscription.read`. Escenario real (migración 377). */
  const forbidden = ref(false)
  /** 404: no hay plan vigente. **No se pinta un plan a cero**. */
  const notFound = ref(false)

  let inFlight: Promise<void> | null = null

  function resetErrores() {
    error.value = null
    errorTraceId.value = null
    forbidden.value = false
    notFound.value = false
  }

  async function cargar(): Promise<void> {
    resetErrores()
    loading.value = true
    try {
      const sub = await suscripcionApi.findCurrent()
      subscription.value = sub
      // Las líneas son un bloque secundario: si fallan, el plan sigue en pantalla.
      try {
        const page = await suscripcionApi.listItems(sub.id)
        items.value = page.content
      } catch {
        items.value = []
      }
    } catch (e: unknown) {
      subscription.value = null
      items.value = []
      if (isNotFound(e)) {
        notFound.value = true
      } else if (isForbidden(e)) {
        forbidden.value = true
      } else {
        error.value = getProblemDetailMessage(e, 'No se pudo cargar tu plan')
        errorTraceId.value = getTraceId(e) ?? null
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * `force` recarga de verdad; la caché solo aplica cuando no se fuerza. Las pantallas llaman
   * con `true` al abrirse — regla obligatoria del repositorio: no mostrar caché vieja al abrir.
   */
  async function load(force = false): Promise<void> {
    if (inFlight) return inFlight
    if (!force && subscription.value) return
    inFlight = cargar().finally(() => {
      inFlight = null
    })
    return inFlight
  }

  function setSubscription(sub: SubscriptionResponse) {
    subscription.value = sub
  }

  return {
    subscription,
    items,
    loading,
    error,
    errorTraceId,
    forbidden,
    notFound,
    load,
    setSubscription,
  }
})

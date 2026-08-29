import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { todayISO } from '@/composables/format'
import { useSuscripcionStore } from '../stores/suscripcion.store'
import { bajaRegistrada, estadoPlan, planVigente, type EstadoPlanActual } from './estadoSuscripcion'

/**
 * Fachada de lectura del plan. **No guarda estado propio**: todo sale del store por
 * `storeToRefs`, que es lo que mantiene una API estable para los componentes sin duplicar la
 * fuente de la verdad.
 */
export function useSuscripcion() {
  const store = useSuscripcionStore()
  const { subscription, items, loading, error, errorTraceId, forbidden, notFound } =
    storeToRefs(store)

  /** El estado tal como se le cuenta a la clínica: rótulo, frase, tono y salida. */
  const estado = computed(() => estadoPlan(subscription.value, todayISO()))

  /** La baja pedida y aún no efectiva. Es un hecho del plan, no un aviso. */
  const baja = computed(() => bajaRegistrada(subscription.value))

  /**
   * ¿Tiene la clínica un plan vigente? **Tres respuestas, no dos.**
   *
   * <p>Es la señal real que el embudo de contratación necesita para no ofrecerle otro plan a
   * quien ya tiene uno. Un 403 —el rol sin `subscription.read`, escenario de la migración 377—
   * y un fallo de red devuelven `DESCONOCIDO`: **no** son «no tiene plan», y confundirlos es
   * exactamente lo que la especificación prohíbe. Un 404, o un cuerpo vacío, sí son `SIN_PLAN`.
   */
  const estadoPlanActual = computed<EstadoPlanActual>(() => {
    if (forbidden.value || error.value) return 'DESCONOCIDO'
    if (notFound.value) return 'SIN_PLAN'
    if (!subscription.value) return 'SIN_PLAN'
    return planVigente(subscription.value) ? 'CON_PLAN' : 'SIN_PLAN'
  })

  /** Total de las líneas del plan, tal como las devuelve el backend. */
  const totalLineas = computed(() =>
    items.value.reduce((acc, it) => acc + (it.unitAmount ?? 0) * (it.quantity ?? 0), 0),
  )

  return {
    subscription,
    items,
    loading,
    error,
    errorTraceId,
    forbidden,
    notFound,
    estado,
    estadoPlanActual,
    baja,
    totalLineas,
    load: store.load,
    setSubscription: store.setSubscription,
  }
}

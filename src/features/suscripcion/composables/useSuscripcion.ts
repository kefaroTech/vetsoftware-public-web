import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { todayISO } from '@/composables/format'
import { useSuscripcionStore } from '../stores/suscripcion.store'
import { bajaRegistrada, estadoPlan } from './estadoSuscripcion'

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
    baja,
    totalLineas,
    load: store.load,
    setSubscription: store.setSubscription,
  }
}

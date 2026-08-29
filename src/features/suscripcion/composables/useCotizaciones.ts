import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { todayISO } from '@/composables/format'
import { useToast } from '@/composables/useToast'
import { useCotizacionesStore } from '../stores/cotizaciones.store'
import { vigencia } from './cotizacionesText'

/**
 * Fachada del detalle de una propuesta y de sus dos respuestas.
 *
 * <p>El listado lo sirve `useServerPaged` desde su vista: es estado por instancia de pantalla.
 */
export function useCotizaciones() {
  const store = useCotizacionesStore()
  const toast = useToast()
  const { quote, loading, error, errorTraceId, forbidden, totalMostrado, avisoImporte } =
    storeToRefs(store)

  const vigenciaActual = computed(() => vigencia(quote.value?.validUntil, todayISO()))

  /** Las líneas, leídas con `Array.isArray`: `lines[]` va suelto en el contrato. */
  const lineas = computed(() => (Array.isArray(quote.value?.lines) ? quote.value.lines : []))

  /** Solo se responde a una propuesta enviada y todavía vigente. */
  const puedeResponder = computed(
    () => quote.value?.status === 'SENT' && vigenciaActual.value.vigente,
  )

  async function aceptar(acceptedByEmail: string): Promise<boolean> {
    const id = quote.value?.id
    if (id == null) return false
    try {
      await store.accept(id, { acceptedByEmail })
      toast.success('Propuesta aceptada', 'Tu plan se actualiza con las líneas de la propuesta.')
      return true
    } catch (e: unknown) {
      toast.errorFrom('No se pudo aceptar la propuesta', e)
      return false
    }
  }

  async function rechazar(): Promise<boolean> {
    const id = quote.value?.id
    if (id == null) return false
    try {
      await store.reject(id)
      toast.success('Propuesta rechazada', 'Puedes pedir otra cuando quieras.')
      return true
    } catch (e: unknown) {
      toast.errorFrom('No se pudo rechazar la propuesta', e)
      return false
    }
  }

  return {
    quote,
    lineas,
    loading,
    error,
    errorTraceId,
    forbidden,
    totalMostrado,
    avisoImporte,
    vigenciaActual,
    puedeResponder,
    loadDetalle: store.loadDetalle,
    aceptar,
    rechazar,
  }
}

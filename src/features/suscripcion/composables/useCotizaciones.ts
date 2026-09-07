import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { todayISO } from '@/composables/format'
import { useToast } from '@/composables/useToast'
import { getProblemDetailCode, getTraceId } from '@/services/http/http.client'
import { useToastStore } from '@/stores/toast.store'
import { PERMISSIONS } from '@/constants/permissions'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useCotizacionesStore } from '../stores/cotizaciones.store'
import { mensajeConflictoCotizacion, vigencia } from './cotizacionesText'

/** Mismo presupuesto que `useToast().errorFrom`: un error con traza queda más tiempo en pantalla. */
const TRACE_DURATION_MS = 9000

/**
 * Fachada del detalle de una propuesta y de sus dos respuestas.
 *
 * <p>El listado lo sirve `useServerPaged` desde su vista: es estado por instancia de pantalla.
 */
export function useCotizaciones() {
  const store = useCotizacionesStore()
  const toast = useToast()
  const toastStore = useToastStore()
  const { quote, loading, error, errorTraceId, forbidden, totalMostrado, avisoImporte } =
    storeToRefs(store)

  const vigenciaActual = computed(() => vigencia(quote.value?.validUntil, todayISO()))

  /** Las líneas, leídas con `Array.isArray`: `lines[]` va suelto en el contrato. */
  const lineas = computed(() => (Array.isArray(quote.value?.lines) ? quote.value.lines : []))

  /** Solo se responde a una propuesta enviada y todavía vigente. **Es el gate del DOMINIO.** */
  const puedeResponder = computed(
    () => quote.value?.status === 'SENT' && vigenciaActual.value.vigente,
  )

  /**
   * …y este es el gate del PERMISO, que faltaba entero.
   *
   * <p>`quote.accept` y `quote.reject` son permisos distintos y se comprueban por separado: un
   * rol puede aceptar y no rechazar. Sin esto, los dos botones salían para cualquiera que
   * llegara al detalle con `quote.read`, y aceptar una propuesta —que es firmar, con
   * `acceptedByEmail` y `acceptedIp` de constancia— devolvía un 403 después de que el usuario
   * hubiera escrito su correo en el modal de confirmación.
   */
  const { can } = useAuthorization()
  const puedeAceptarPermiso = can(PERMISSIONS.QUOTE_ACCEPT)
  const puedeRechazarPermiso = can(PERMISSIONS.QUOTE_REJECT)

  const puedeAceptar = computed(() => puedeResponder.value && puedeAceptarPermiso.value)
  const puedeRechazar = computed(() => puedeResponder.value && puedeRechazarPermiso.value)

  async function aceptar(acceptedByEmail: string): Promise<boolean> {
    const id = quote.value?.id
    if (id == null) return false
    try {
      await store.accept(id, { acceptedByEmail })
      toast.success('Propuesta aceptada', 'Tu plan se actualiza con las líneas de la propuesta.')
      return true
    } catch (e: unknown) {
      const code = getProblemDetailCode(e)
      /**
       * Dos administradoras aceptando la misma propuesta a la vez: quien pierde la carrera no
       * falló, llegó tarde — el contrato de la OTRA ya existe. Mismo criterio que
       * `usePasoContratar.confirmarPago` da a la carrera equivalente de la contratación inicial:
       * se recarga y se cuenta como resuelto, no como error.
       */
      if (code === 'QUOTE_ALREADY_CONVERTED') {
        await store.loadDetalle(id)
        toast.info(
          'Ya se aceptó esta propuesta',
          'Alguien de tu equipo la aceptó justo antes. Tu plan ya quedó actualizado.',
        )
        return true
      }
      // `errorFrom` antepone el `detail` del backend a cualquier `fallback`: aquí no sirve.
      const traducido = mensajeConflictoCotizacion(code)
      if (traducido) {
        toastStore.push(
          'error',
          'No se pudo aceptar la propuesta',
          traducido,
          TRACE_DURATION_MS,
          getTraceId(e),
        )
      } else {
        toast.errorFrom('No se pudo aceptar la propuesta', e)
      }
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
    // `puedeResponder` NO se expone: es el gate de dominio y ya viaja dentro de los dos de
    // abajo. Exportarlo suelto invita a volver a pintar un botón sin mirar el permiso, que es
    // justo el fallo que se acaba de cerrar.
    puedeAceptar,
    puedeRechazar,
    loadDetalle: store.loadDetalle,
    aceptar,
    rechazar,
  }
}

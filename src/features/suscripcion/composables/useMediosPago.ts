import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { todayISO } from '@/composables/format'
import { useToast } from '@/composables/useToast'
import { useMediosPagoStore } from '../stores/medios-pago.store'
import { avisoVencimiento, medioTexto, type AvisoMedioPago } from './cotizacionesText'
import type { SubscriptionPaymentMethodResponse } from '../types/medios-pago.types'

export interface MedioConAviso {
  medio: SubscriptionPaymentMethodResponse
  aviso: AvisoMedioPago | null
}

/**
 * Fachada de los medios de pago: estado del store, avisos calculados y las dos escrituras que
 * el tenant sí tiene (hacer predeterminado y revocar).
 */
export function useMediosPago(nextBillingDate: () => string | undefined) {
  const store = useMediosPagoStore()
  const toast = useToast()
  const { methods, activos, loading, error, errorTraceId, forbidden, anuncio } = storeToRefs(store)

  const medios = computed<MedioConAviso[]>(() =>
    methods.value.map((medio) => ({
      medio,
      aviso: avisoVencimiento(
        medio.brand,
        medio.lastFour,
        medio.expiresOn,
        nextBillingDate(),
        todayISO(),
      ),
    })),
  )

  /** El aviso que sube al banner de la pantalla: el más grave de todos. */
  const avisoPrincipal = computed<AvisoMedioPago | null>(() => {
    const avisos = medios.value.map((m) => m.aviso).filter((a): a is AvisoMedioPago => a !== null)
    return avisos.find((a) => a.tono === 'error') ?? avisos[0] ?? null
  })

  const esUnicoActivo = computed(() => activos.value.length === 1)

  /**
   * `PATCH /{id}/default`. **Sin toast**: la píldora se mueve y la evidencia queda en pantalla.
   * Pero «no poner cartel» no es «no anunciar»: se emite el cambio en la región invisible.
   */
  async function hacerPredeterminado(medio: SubscriptionPaymentMethodResponse) {
    try {
      await store.setDefault(medio.id)
      store.anunciar(`Ahora tu medio predeterminado es ${medioTexto(medio.brand, medio.lastFour)}.`)
    } catch (e: unknown) {
      toast.errorFrom('No se pudo cambiar tu medio predeterminado', e)
    }
  }

  async function revocar(medio: SubscriptionPaymentMethodResponse, reason: string) {
    await store.revoke(medio.id, reason)
    toast.success('Medio de pago revocado', `${medioTexto(medio.brand, medio.lastFour)}.`)
  }

  return {
    methods,
    medios,
    activos,
    avisoPrincipal,
    esUnicoActivo,
    loading,
    error,
    errorTraceId,
    forbidden,
    anuncio,
    load: store.load,
    hacerPredeterminado,
    revocar,
  }
}

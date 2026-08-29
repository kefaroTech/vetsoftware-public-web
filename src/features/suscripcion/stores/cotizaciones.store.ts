import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getProblemDetailMessage, getTraceId } from '@/services/http/http.client'
import { cotizacionesApi } from '../api/cotizaciones.api'
import { isForbidden } from '../composables/accesoBloqueado'
import { importeCambiado } from '../composables/cotizacionesText'
import type { AcceptQuoteRequest, QuoteResponse } from '../types/cotizaciones.types'

export const useCotizacionesStore = defineStore('suscripcionCotizaciones', () => {
  const quote = ref<QuoteResponse | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const errorTraceId = ref<string | null>(null)
  const forbidden = ref(false)

  /**
   * **El importe que se pintó**, capturado al cargar el detalle.
   *
   * <p>Es la regla del modelo: al confirmar se envía y se cita el importe que se mostró en
   * pantalla, no uno recalculado en el momento del clic. Sin esta copia, entre el render y la
   * confirmación cabe un cambio que el usuario nunca vio y que acabaría aceptando.
   */
  const totalMostrado = ref<number | null>(null)

  /** Aviso de discrepancia tras aceptar. **Nunca se sobrescribe el importe en silencio.** */
  const avisoImporte = ref<string | null>(null)

  async function loadDetalle(id: number): Promise<void> {
    loading.value = true
    error.value = null
    errorTraceId.value = null
    forbidden.value = false
    avisoImporte.value = null
    quote.value = null
    totalMostrado.value = null
    try {
      const q = await cotizacionesApi.findById(id)
      quote.value = q
      totalMostrado.value = q.totalAmount ?? null
    } catch (e: unknown) {
      if (isForbidden(e)) {
        forbidden.value = true
      } else {
        error.value = getProblemDetailMessage(e, 'No se pudo cargar la propuesta')
        errorTraceId.value = getTraceId(e) ?? null
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * Acepta la propuesta y compara lo devuelto con lo que se enseñó.
   *
   * <p>Si difieren se levanta un banner con **los dos importes**. El usuario decide; la pantalla
   * no elige por él ni disimula el cambio.
   */
  async function accept(id: number, payload: AcceptQuoteRequest): Promise<void> {
    const mostrado = totalMostrado.value
    const devuelta = await cotizacionesApi.accept(id, payload)
    quote.value = devuelta
    const devuelto = devuelta.totalAmount ?? null
    avisoImporte.value =
      mostrado != null && devuelto != null && mostrado !== devuelto
        ? importeCambiado(mostrado, devuelto)
        : null
  }

  async function reject(id: number): Promise<void> {
    quote.value = await cotizacionesApi.reject(id)
  }

  return {
    quote,
    loading,
    error,
    errorTraceId,
    forbidden,
    totalMostrado,
    avisoImporte,
    loadDetalle,
    accept,
    reject,
  }
})

import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  AcceptQuoteRequest,
  QuoteResponse,
  QuoteSummaryResponse,
  SelfServeQuoteRequest,
} from '../types/cotizaciones.types'

/**
 * Propuestas. Sin `companyId` en ningún cuerpo: ver `suscripcion.api.ts`.
 *
 * <p>No hay `create`: `POST /quotes` es de sistema, porque su cuerpo lleva tarifa, vigencia,
 * días de prueba y descuento por línea. Lo que sí puede pedir la clínica es `selfServe`, que no
 * lleva ninguna de esas cosas.
 */
export const cotizacionesApi = {
  async listAll(page = 0, pageSize = 20): Promise<PageResponse<QuoteSummaryResponse>> {
    const { data } = await http.get<PageResponse<QuoteSummaryResponse>>('/quotes', {
      params: { page, pageSize },
    })
    return data
  },

  async findById(id: number): Promise<QuoteResponse> {
    const { data } = await http.get<QuoteResponse>(`/quotes/${id}`)
    return data
  },

  /**
   * `POST /self-serve` — la clínica pide su propia oferta y la recibe ya `SENT`.
   *
   * <p>Gate: `hasAuthority('quote.request')` más `isMyCompany` sobre la empresa que el
   * controlador deriva del principal (`SelfServeQuoteUseCase`). Sin ese permiso responde 403, y
   * es un permiso de nivel `FULL`: una empresa en mora no lo tiene. Quien llame desde una
   * pantalla debe esconder la acción antes, no descubrirlo por el error.
   *
   * <p>Devuelve **201 también en el reintento idempotente** con la misma `clientRequestId`: la
   * segunda llamada no crea una segunda oferta, devuelve la primera.
   */
  async selfServe(payload: SelfServeQuoteRequest): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>('/quotes/self-serve', payload)
    return data
  },

  /** `POST /{id}/accept`. La IP y la marca de tiempo las escribe el servidor. */
  async accept(id: number, payload: AcceptQuoteRequest): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>(`/quotes/${id}/accept`, payload)
    return data
  },

  /** `POST /{id}/reject` — sin cuerpo. */
  async reject(id: number): Promise<QuoteResponse> {
    const { data } = await http.post<QuoteResponse>(`/quotes/${id}/reject`)
    return data
  },
}

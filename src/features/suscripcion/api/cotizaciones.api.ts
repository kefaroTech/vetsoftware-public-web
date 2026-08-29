import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  AcceptQuoteRequest,
  QuoteResponse,
  QuoteSummaryResponse,
} from '../types/cotizaciones.types'

/**
 * Propuestas de la plataforma. Sin `companyId`: ver `suscripcion.api.ts`.
 *
 * <p>No hay `create`: `POST /quotes` es de sistema. La plataforma propone, la clínica acepta.
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

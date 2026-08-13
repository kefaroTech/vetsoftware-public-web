import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type { ClinicalEventResponse, ClinicalEventType } from '../types/historia'

export interface ClinicalHistoryParams {
  types?: ClinicalEventType[]
  from?: string
  to?: string
  /** Texto libre sobre el resumen del evento; lo resuelve el servidor (BE-06). */
  q?: string
  /** Solo los procedimientos derivados de esta consulta. */
  consultationId?: number
}

/** Cuántos eventos de cada tipo tiene el animal en toda su historia. */
export interface ClinicalEventTypeCount {
  eventType: ClinicalEventType
  count: number
}

function buildQuery(params: ClinicalHistoryParams): Record<string, string | number> {
  const query: Record<string, string | number> = {}
  if (params.types && params.types.length > 0) {
    query.types = params.types.join(',')
  }
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  if (params.q && params.q.trim()) query.q = params.q.trim()
  if (params.consultationId != null) query.consultationId = params.consultationId
  return query
}

export const clinicalHistoryApi = {
  /**
   * BE-06: la historia se lee por páginas y los filtros (tipo, rango, búsqueda) viajan al
   * servidor. Un paciente crónico acumula cientos de eventos y la pantalla pinta los primeros.
   */
  async findByAnimal(
    animalId: number,
    params: ClinicalHistoryParams = {},
    page = 0,
    pageSize = 20,
    signal?: AbortSignal,
  ): Promise<PageResponse<ClinicalEventResponse>> {
    const { data } = await http.get<PageResponse<ClinicalEventResponse>>(
      `/animals/${animalId}/clinical-history`,
      { params: { ...buildQuery(params), page, pageSize }, signal },
    )
    return data
  },

  /** Contador por tipo sobre toda la historia, para los chips de filtro. */
  async summary(animalId: number): Promise<ClinicalEventTypeCount[]> {
    const { data } = await http.get<ClinicalEventTypeCount[]>(
      `/animals/${animalId}/clinical-history/summary`,
    )
    return data
  },

  async exportPdf(animalId: number, params: ClinicalHistoryParams = {}): Promise<Blob> {
    const { data } = await http.get<Blob>(`/animals/${animalId}/clinical-history/export.pdf`, {
      params: buildQuery(params),
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return data
  },
}

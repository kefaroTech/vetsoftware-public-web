import { http } from '@/services/http/http.client'
import type {
  ClinicalEventResponse,
  ClinicalEventType,
} from '../types/historia'

export interface ClinicalHistoryParams {
  types?: ClinicalEventType[]
  from?: string
  to?: string
}

function buildQuery(params: ClinicalHistoryParams): Record<string, string> {
  const query: Record<string, string> = {}
  if (params.types && params.types.length > 0) {
    query.types = params.types.join(',')
  }
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  return query
}

export const clinicalHistoryApi = {
  async findByAnimal(
    animalId: number,
    params: ClinicalHistoryParams = {},
  ): Promise<ClinicalEventResponse[]> {
    const { data } = await http.get<ClinicalEventResponse[]>(
      `/animals/${animalId}/clinical-history`,
      { params: buildQuery(params) },
    )
    return data
  },

  async exportPdf(
    animalId: number,
    params: ClinicalHistoryParams = {},
  ): Promise<Blob> {
    const { data } = await http.get<Blob>(
      `/animals/${animalId}/clinical-history/export.pdf`,
      { params: buildQuery(params), responseType: 'blob' },
    )
    return data
  },
}

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

export const clinicalHistoryApi = {
  async findByAnimal(
    animalId: number,
    params: ClinicalHistoryParams = {},
  ): Promise<ClinicalEventResponse[]> {
    const query: Record<string, string> = {}
    if (params.types && params.types.length > 0) {
      query.types = params.types.join(',')
    }
    if (params.from) query.from = params.from
    if (params.to) query.to = params.to
    const { data } = await http.get<ClinicalEventResponse[]>(
      `/animals/${animalId}/clinical-history`,
      { params: query },
    )
    return data
  },
}

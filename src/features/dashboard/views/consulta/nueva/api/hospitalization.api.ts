import { http } from '@/services/http/http.client'
import type { HospitalizationType, ReasonLeaving } from '@/types/domain'

export interface CreateHospitalizationPayload {
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface HospitalizationResponse {
  id: number
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  createdDate: string
}

export const hospitalizationApi = {
  async create(
    payload: CreateHospitalizationPayload,
  ): Promise<HospitalizationResponse> {
    const { data } = await http.post<HospitalizationResponse>(
      '/hospitalizations',
      payload,
    )
    return data
  },
}

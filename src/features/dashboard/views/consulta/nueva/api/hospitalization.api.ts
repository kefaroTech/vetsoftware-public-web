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

export interface HospitalizationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface HospitalizationConsultationSummary {
  id: number
  date: string
}

export interface HospitalizationCompanySummary {
  id: number
  name: string
  identifier: string
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
  animal: HospitalizationAnimalSummary
  consultation: HospitalizationConsultationSummary | null
  company: HospitalizationCompanySummary
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

  async listAll(): Promise<HospitalizationResponse[]> {
    const { data } = await http.get<HospitalizationResponse[]>('/hospitalizations')
    return data
  },

  async listByAnimal(animalId: number): Promise<HospitalizationResponse[]> {
    const { data } = await http.get<HospitalizationResponse[]>(
      `/hospitalizations/by-animal/${animalId}`,
    )
    return data
  },

  async findById(id: number): Promise<HospitalizationResponse> {
    const { data } = await http.get<HospitalizationResponse>(
      `/hospitalizations/${id}`,
    )
    return data
  },

  async update(
    id: number,
    payload: CreateHospitalizationPayload,
  ): Promise<HospitalizationResponse> {
    const { data } = await http.put<HospitalizationResponse>(
      `/hospitalizations/${id}`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/hospitalizations/${id}`)
  },
}

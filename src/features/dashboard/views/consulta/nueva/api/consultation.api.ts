import { http } from '@/services/http/http.client'

export interface CreateConsultationPayload {
  date: string
  consultationTypeId: number
  anamnesis: string
  diagnosis: string
  therapeuticPlan: string
  diagnosisPlan: string
  nextControl: string | null
  animalId: number
}

export interface ConsultationResponse {
  id: number
  date: string
  anamnesis: string
  diagnosis: string
  therapeuticPlan: string
  diagnosisPlan: string
  nextControl: string | null
  createdDate: string
}

export const consultationApi = {
  async create(payload: CreateConsultationPayload): Promise<ConsultationResponse> {
    const { data } = await http.post<ConsultationResponse>('/consultations', payload)
    return data
  },
}

import { http } from '@/services/http/http.client'

export interface CreateConsultationPayload {
  date: string
  consultationTypeId: number
  anamnesis: string
  diagnosis: string | null
  therapeuticPlan: string | null
  diagnosisPlan: string | null
  nextControl: string | null
  animalId: number
  // Peso opcional capturado en la consulta → historial de peso del animal.
  weight?: number | null
  weightUnit?: string | null
}

export interface ConsultationTypeSummary {
  id: number
  name: string
}

export interface ConsultationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface ConsultationCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface ConsultationResponse {
  id: number
  date: string
  consultationType: ConsultationTypeSummary
  anamnesis: string
  diagnosis: string | null
  therapeuticPlan: string | null
  diagnosisPlan: string | null
  nextControl: string | null
  animal: ConsultationAnimalSummary
  company: ConsultationCompanySummary
  createdDate: string
}

export const consultationApi = {
  async create(payload: CreateConsultationPayload): Promise<ConsultationResponse> {
    const { data } = await http.post<ConsultationResponse>('/consultations', payload)
    return data
  },

  async findById(id: number): Promise<ConsultationResponse> {
    const { data } = await http.get<ConsultationResponse>(`/consultations/${id}`)
    return data
  },
}

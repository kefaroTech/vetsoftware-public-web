import { http } from '@/services/http/http.client'
import type { DewormingType } from '@/types/domain'

export interface CreateDewormingPayload {
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface DewormingAnimalSummary {
  id: number
  name: string
  code: string
}

export interface DewormingConsultationSummary {
  id: number
  date: string
}

export interface DewormingCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface DewormingResponse {
  id: number
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animal: DewormingAnimalSummary
  consultation: DewormingConsultationSummary | null
  company: DewormingCompanySummary
  createdDate: string
}

export const dewormingApi = {
  async create(payload: CreateDewormingPayload): Promise<DewormingResponse> {
    const { data } = await http.post<DewormingResponse>('/dewormings', payload)
    return data
  },

  async listAll(): Promise<DewormingResponse[]> {
    const { data } = await http.get<DewormingResponse[]>('/dewormings')
    return data
  },
}

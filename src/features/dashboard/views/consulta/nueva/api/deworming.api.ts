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

export interface DewormingResponse {
  id: number
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  createdDate: string
}

export const dewormingApi = {
  async create(payload: CreateDewormingPayload): Promise<DewormingResponse> {
    const { data } = await http.post<DewormingResponse>('/dewormings', payload)
    return data
  },
}

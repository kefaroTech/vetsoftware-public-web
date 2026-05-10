import { http } from '@/services/http/http.client'

export interface CreateSurgeryPayload {
  date: string
  surgeryTypeId: number
  description: string
  medicament: string
  observations: string
  complications: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface SurgeryResponse {
  id: number
  date: string
  description: string
  medicament: string
  observations: string
  complications: string
  createdDate: string
}

export const surgeryApi = {
  async create(payload: CreateSurgeryPayload): Promise<SurgeryResponse> {
    const { data } = await http.post<SurgeryResponse>('/surgeries', payload)
    return data
  },
}

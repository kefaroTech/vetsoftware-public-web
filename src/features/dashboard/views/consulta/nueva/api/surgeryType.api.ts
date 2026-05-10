import { http } from '@/services/http/http.client'

export interface SurgeryTypeResponse {
  id: number
  name: string
  description: string | null
  createdDate: string
}

export interface CreateSurgeryTypePayload {
  name: string
  description: string
}

export const surgeryTypeApi = {
  async listAll(): Promise<SurgeryTypeResponse[]> {
    const { data } = await http.get<SurgeryTypeResponse[]>('/surgery-types/available')
    return data
  },

  async create(payload: CreateSurgeryTypePayload): Promise<SurgeryTypeResponse> {
    const { data } = await http.post<SurgeryTypeResponse>('/surgery-types/available', payload)
    return data
  },
}

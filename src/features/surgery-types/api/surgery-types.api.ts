import type { SurgeryTypeResponse, CreateSurgeryTypePayload } from '../types/surgery-types.types'
import { http } from '@/services/http/http.client'

export const surgeryTypeApi = {
  async listAll(): Promise<SurgeryTypeResponse[]> {
    const { data } = await http.get<SurgeryTypeResponse[]>('/surgery-types/available')
    return data
  },

  async create(payload: CreateSurgeryTypePayload): Promise<SurgeryTypeResponse> {
    const { data } = await http.post<SurgeryTypeResponse>('/surgery-types', payload)
    return data
  },
}

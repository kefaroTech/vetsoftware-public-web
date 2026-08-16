import type { ConsultationTypeResponse } from '../types/consultation-types.types'
import { http } from '@/services/http/http.client'

export const consultationTypeApi = {
  async listAll(): Promise<ConsultationTypeResponse[]> {
    const { data } = await http.get<ConsultationTypeResponse[]>('/consultation-types')
    return data
  },

  async findById(id: number): Promise<ConsultationTypeResponse> {
    const { data } = await http.get<ConsultationTypeResponse>(`/consultation-types/${id}`)
    return data
  },
}

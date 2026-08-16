import type { CreateConsultationPayload, ConsultationResponse } from '../types/consultation.types'
import { http } from '@/services/http/http.client'

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

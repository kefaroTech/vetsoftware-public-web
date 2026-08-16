import { http } from '@/services/http/http.client'

export interface ConsultationTypeResponse {
  id: number
  name: string
  /** TR-01: el backend lo garantiza (columna NOT NULL); no era nulable. */
  description: string
  createdDate: string
}

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

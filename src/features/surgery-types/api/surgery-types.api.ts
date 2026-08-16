import { http } from '@/services/http/http.client'

export interface SurgeryTypeResponse {
  id: number
  name: string
  /** TR-01: el backend lo garantiza (columna NOT NULL); no era nulable. */
  description: string
  /**
   * TR-01: el backend los devuelve y este repositorio no los declaraba, así que el admin y este
   * describían el mismo catálogo de forma distinta. `general` distingue el catálogo de plataforma
   * del propio de la empresa, y `company` es null justo cuando es general.
   */
  company: { id: number; name: string } | null
  general: boolean
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
    const { data } = await http.post<SurgeryTypeResponse>('/surgery-types', payload)
    return data
  },
}

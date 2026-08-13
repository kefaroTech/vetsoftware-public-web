import { http } from '@/services/http/http.client'

export interface VaccinationTypeResponse {
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

export interface CreateVaccinationTypePayload {
  name: string
  description: string
}

export const vaccinationTypeApi = {
  async listAll(): Promise<VaccinationTypeResponse[]> {
    const { data } = await http.get<VaccinationTypeResponse[]>('/vaccination-types/available')
    return data
  },

  async create(payload: CreateVaccinationTypePayload): Promise<VaccinationTypeResponse> {
    const { data } = await http.post<VaccinationTypeResponse>('/vaccination-types', payload)
    return data
  },
}

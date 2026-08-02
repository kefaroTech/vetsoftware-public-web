import { http } from '@/services/http/http.client'

export interface VaccinationTypeResponse {
  id: number
  name: string
  description: string | null
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

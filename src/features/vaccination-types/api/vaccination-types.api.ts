import type {
  VaccinationTypeResponse,
  CreateVaccinationTypePayload,
} from '../types/vaccination-types.types'
import { http } from '@/services/http/http.client'

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

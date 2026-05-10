import { http } from '@/services/http/http.client'

export interface CreateVaccinationPayload {
  date: string
  vaccinationTypeId: number
  lot: string
  notes: string
  nextVaccination: string | null
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface VaccinationResponse {
  id: number
  date: string
  lot: string
  notes: string
  nextVaccination: string | null
  createdDate: string
}

export const vaccinationApi = {
  async create(payload: CreateVaccinationPayload): Promise<VaccinationResponse> {
    const { data } = await http.post<VaccinationResponse>('/vaccinations', payload)
    return data
  },
}

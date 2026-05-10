import { http } from '@/services/http/http.client'

export interface CreateLaboratoryTestPayload {
  date: string
  testTypeId: number
  quantity: number
  diagnosis: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface LaboratoryTestResponse {
  id: number
  date: string
  quantity: number
  diagnosis: string
  createdDate: string
}

export const laboratoryTestApi = {
  async create(payload: CreateLaboratoryTestPayload): Promise<LaboratoryTestResponse> {
    const { data } = await http.post<LaboratoryTestResponse>(
      '/laboratory-tests',
      payload,
    )
    return data
  },
}

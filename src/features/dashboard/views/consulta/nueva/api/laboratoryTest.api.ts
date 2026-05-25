import { http } from '@/services/http/http.client'
import type { LaboratoryTestStatus } from '@/types/domain'

export interface CreateLaboratoryTestPayload {
  date: string
  testTypeId: number
  quantity: number
  diagnosis: string
  status?: LaboratoryTestStatus
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface LaboratoryTestTypeSummary {
  id: number
  name: string
}

export interface LaboratoryTestAnimalSummary {
  id: number
  name: string
  code: string
}

export interface LaboratoryTestConsultationSummary {
  id: number
  date: string
}

export interface LaboratoryTestCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface LaboratoryTestResponse {
  id: number
  date: string
  testType: LaboratoryTestTypeSummary
  quantity: number
  diagnosis: string
  status: LaboratoryTestStatus
  animal: LaboratoryTestAnimalSummary
  consultation: LaboratoryTestConsultationSummary | null
  company: LaboratoryTestCompanySummary
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

  async listAll(): Promise<LaboratoryTestResponse[]> {
    const { data } = await http.get<LaboratoryTestResponse[]>('/laboratory-tests')
    return data
  },

  async listByAnimal(animalId: number): Promise<LaboratoryTestResponse[]> {
    const { data } = await http.get<LaboratoryTestResponse[]>(
      `/laboratory-tests/by-animal/${animalId}`,
    )
    return data
  },

  async findById(id: number): Promise<LaboratoryTestResponse> {
    const { data } = await http.get<LaboratoryTestResponse>(
      `/laboratory-tests/${id}`,
    )
    return data
  },

  async update(
    id: number,
    payload: CreateLaboratoryTestPayload,
  ): Promise<LaboratoryTestResponse> {
    const { data } = await http.put<LaboratoryTestResponse>(
      `/laboratory-tests/${id}`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/laboratory-tests/${id}`)
  },

  async changeStatus(
    id: number,
    status: LaboratoryTestStatus,
  ): Promise<LaboratoryTestResponse> {
    const { data } = await http.patch<LaboratoryTestResponse>(
      `/laboratory-tests/${id}/status`,
      { status },
    )
    return data
  },
}

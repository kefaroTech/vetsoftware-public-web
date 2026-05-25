import { http } from '@/services/http/http.client'

export interface CreateSpaPayload {
  date: string
  spaTypeId: number
  reason: string
  details: string
  observations: string
  animalId: number
  companyId: number
}

export interface SpaTypeSummary {
  id: number
  name: string
}

export interface SpaAnimalSummary {
  id: number
  name: string
  code: string
}

export interface SpaCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface SpaResponse {
  id: number
  date: string
  spaType: SpaTypeSummary
  reason: string
  details: string
  observations: string
  animal: SpaAnimalSummary
  company: SpaCompanySummary
  createdDate: string
}

export const spaApi = {
  async create(payload: CreateSpaPayload): Promise<SpaResponse> {
    const { data } = await http.post<SpaResponse>('/spas', payload)
    return data
  },

  async listAll(): Promise<SpaResponse[]> {
    const { data } = await http.get<SpaResponse[]>('/spas')
    return data
  },

  async listByAnimal(animalId: number): Promise<SpaResponse[]> {
    const { data } = await http.get<SpaResponse[]>(`/spas/by-animal/${animalId}`)
    return data
  },

  async findById(id: number): Promise<SpaResponse> {
    const { data } = await http.get<SpaResponse>(`/spas/${id}`)
    return data
  },

  async update(id: number, payload: CreateSpaPayload): Promise<SpaResponse> {
    const { data } = await http.put<SpaResponse>(`/spas/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/spas/${id}`)
  },
}

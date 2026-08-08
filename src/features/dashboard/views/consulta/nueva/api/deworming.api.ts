import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { DewormingType } from '@/types/domain'

export interface CreateDewormingPayload {
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface DewormingAnimalSummary {
  id: number
  name: string
  code: string
}

export interface DewormingConsultationSummary {
  id: number
  date: string
}

export interface DewormingCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface DewormingResponse {
  id: number
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animal: DewormingAnimalSummary
  consultation: DewormingConsultationSummary | null
  company: DewormingCompanySummary
  createdDate: string
}

export const dewormingApi = {
  async create(payload: CreateDewormingPayload): Promise<DewormingResponse> {
    const { data } = await http.post<DewormingResponse>('/dewormings', payload)
    return data
  },

  async listAll(): Promise<DewormingResponse[]> {
    const { data } = await http.get<DewormingResponse[]>('/dewormings')
    return data
  },

  async listByAnimal(
    animalId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<DewormingResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<DewormingResponse>>(
      `/dewormings/by-animal/${animalId}`,
      {
        params: { page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<DewormingResponse> {
    const { data } = await http.get<DewormingResponse>(`/dewormings/${id}`)
    return data
  },

  async update(id: number, payload: CreateDewormingPayload): Promise<DewormingResponse> {
    const { data } = await http.put<DewormingResponse>(`/dewormings/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/dewormings/${id}`)
  },
}

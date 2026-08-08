import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

export interface CreateSurgeryPayload {
  date: string
  surgeryTypeId: number
  description: string
  medicament: string
  observations: string
  complications: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface SurgeryTypeSummary {
  id: number
  name: string
}

export interface SurgeryAnimalSummary {
  id: number
  name: string
  code: string
}

export interface SurgeryConsultationSummary {
  id: number
  date: string
}

export interface SurgeryCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface SurgeryResponse {
  id: number
  date: string
  surgeryType: SurgeryTypeSummary
  description: string
  medicament: string
  observations: string
  complications: string
  animal: SurgeryAnimalSummary
  consultation: SurgeryConsultationSummary | null
  company: SurgeryCompanySummary
  createdDate: string
}

export const surgeryApi = {
  async create(payload: CreateSurgeryPayload): Promise<SurgeryResponse> {
    const { data } = await http.post<SurgeryResponse>('/surgeries', payload)
    return data
  },

  async listAll(): Promise<SurgeryResponse[]> {
    const { data } = await http.get<SurgeryResponse[]>('/surgeries')
    return data
  },

  async listByAnimal(
    animalId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<SurgeryResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<SurgeryResponse>>(
      `/surgeries/by-animal/${animalId}`,
      {
        params: { page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<SurgeryResponse> {
    const { data } = await http.get<SurgeryResponse>(`/surgeries/${id}`)
    return data
  },

  async update(id: number, payload: CreateSurgeryPayload): Promise<SurgeryResponse> {
    const { data } = await http.put<SurgeryResponse>(`/surgeries/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/surgeries/${id}`)
  },
}

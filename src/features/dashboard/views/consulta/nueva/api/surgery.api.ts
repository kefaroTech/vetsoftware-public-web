import type { CreateSurgeryPayload, SurgeryResponse } from '../types/surgery.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

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
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<SurgeryResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<SurgeryResponse>>(
      `/surgeries/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
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

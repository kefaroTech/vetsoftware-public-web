import type { CreateDewormingPayload, DewormingResponse } from '../types/deworming.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

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
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<DewormingResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<DewormingResponse>>(
      `/dewormings/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
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

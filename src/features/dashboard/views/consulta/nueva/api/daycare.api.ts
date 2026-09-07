import type { CreateDayCarePayload, DayCareResponse } from '../types/daycare.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

export const daycareApi = {
  async create(payload: CreateDayCarePayload): Promise<DayCareResponse> {
    const { data } = await http.post<DayCareResponse>('/daycares', payload)
    return data
  },

  async listByAnimal(
    animalId: number,
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<DayCareResponse>> {
    const { data } = await http.get<PageResponse<DayCareResponse>>(
      `/daycares/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<DayCareResponse> {
    const { data } = await http.get<DayCareResponse>(`/daycares/${id}`)
    return data
  },

  async update(id: number, payload: CreateDayCarePayload): Promise<DayCareResponse> {
    const { data } = await http.put<DayCareResponse>(`/daycares/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/daycares/${id}`)
  },
}

import type { OwnerResponse, CreateOwnerRequest, UpdateOwnerRequest } from '../types/owner.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

export const ownerApi = {
  async create(payload: CreateOwnerRequest): Promise<OwnerResponse> {
    const { data } = await http.post<OwnerResponse>('/owners', payload)
    return data
  },

  /**
   * BE-06: `/owners` devolvía la tabla entera. Ahora es una página; el consumidor decide si la
   * acumula (scroll infinito) o la muestra suelta (tabla con paginador).
   */
  async listPage(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<OwnerResponse>> {
    const { data } = await http.get<PageResponse<OwnerResponse>>('/owners', {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  async search(
    query: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<OwnerResponse>> {
    const { data } = await http.get<PageResponse<OwnerResponse>>('/owners/search', {
      params: { q: query, page, pageSize },
      skipGlobalLoader: true,
      signal,
    })
    return data
  },

  async findById(id: number): Promise<OwnerResponse> {
    const { data } = await http.get<OwnerResponse>(`/owners/${id}`)
    return data
  },

  async update(id: number, payload: UpdateOwnerRequest): Promise<OwnerResponse> {
    const { data } = await http.put<OwnerResponse>(`/owners/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/owners/${id}`)
  },
}

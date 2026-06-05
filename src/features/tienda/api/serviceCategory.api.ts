import { http } from '@/services/http/http.client'
import type { CategoryPayload, CategoryResponse } from '../types/tienda'

export const serviceCategoryApi = {
  async listAll(): Promise<CategoryResponse[]> {
    const { data } = await http.get<CategoryResponse[]>('/service-categories')
    return data
  },
  async create(payload: CategoryPayload): Promise<CategoryResponse> {
    const { data } = await http.post<CategoryResponse>('/service-categories', payload)
    return data
  },
  async update(id: number, payload: CategoryPayload): Promise<CategoryResponse> {
    const { data } = await http.put<CategoryResponse>(`/service-categories/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/service-categories/${id}`)
  },
}

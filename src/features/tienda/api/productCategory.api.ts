import { http } from '@/services/http/http.client'
import type { CategoryPayload, CategoryResponse } from '../types/tienda'

export const productCategoryApi = {
  async listAll(): Promise<CategoryResponse[]> {
    const { data } = await http.get<CategoryResponse[]>('/product-categories')
    return data
  },
  async create(payload: CategoryPayload): Promise<CategoryResponse> {
    const { data } = await http.post<CategoryResponse>('/product-categories', payload)
    return data
  },
  async update(id: number, payload: CategoryPayload): Promise<CategoryResponse> {
    const { data } = await http.put<CategoryResponse>(`/product-categories/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/product-categories/${id}`)
  },
}

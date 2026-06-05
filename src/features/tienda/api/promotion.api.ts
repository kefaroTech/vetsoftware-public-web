import { http } from '@/services/http/http.client'
import type { PromotionPayload, PromotionResponse } from '../types/tienda'

export const promotionApi = {
  async listAll(): Promise<PromotionResponse[]> {
    const { data } = await http.get<PromotionResponse[]>('/promotions')
    return data
  },
  async findById(id: number): Promise<PromotionResponse> {
    const { data } = await http.get<PromotionResponse>(`/promotions/${id}`)
    return data
  },
  async create(payload: PromotionPayload): Promise<PromotionResponse> {
    const { data } = await http.post<PromotionResponse>('/promotions', payload)
    return data
  },
  async update(id: number, payload: PromotionPayload): Promise<PromotionResponse> {
    const { data } = await http.put<PromotionResponse>(`/promotions/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/promotions/${id}`)
  },
}

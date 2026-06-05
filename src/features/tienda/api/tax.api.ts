import { http } from '@/services/http/http.client'
import type { TaxResponse } from '../types/tienda'

export const taxApi = {
  async listAll(): Promise<TaxResponse[]> {
    const { data } = await http.get<TaxResponse[]>('/taxes')
    return data
  },
  async findById(id: number): Promise<TaxResponse> {
    const { data } = await http.get<TaxResponse>(`/taxes/${id}`)
    return data
  },
}

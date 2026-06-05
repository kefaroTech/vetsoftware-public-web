import { http } from '@/services/http/http.client'
import type { TaxResponse } from '../types/tienda'

export interface TaxPayload {
  name: string
  percentage: number
}

export const taxApi = {
  async listAll(): Promise<TaxResponse[]> {
    const { data } = await http.get<TaxResponse[]>('/taxes')
    return data
  },
  async findById(id: number): Promise<TaxResponse> {
    const { data } = await http.get<TaxResponse>(`/taxes/${id}`)
    return data
  },
  async create(payload: TaxPayload): Promise<TaxResponse> {
    const { data } = await http.post<TaxResponse>('/taxes', payload)
    return data
  },
  async update(id: number, payload: TaxPayload): Promise<TaxResponse> {
    const { data } = await http.put<TaxResponse>(`/taxes/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/taxes/${id}`)
  },
}

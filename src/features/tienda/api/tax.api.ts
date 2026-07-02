import { http } from '@/services/http/http.client'
import type { TaxResponse, TaxScheme } from '../types/tienda'

export interface TaxPayload {
  name: string
  percentage: number
  taxScheme: TaxScheme
  /** Solo en UPDATE (PUT). El CREATE (POST) no la envía. */
  version?: number
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
  /** Impuestos pausados (enabled=false) de la empresa, para reactivarlos. */
  async listDisabled(): Promise<TaxResponse[]> {
    const { data } = await http.get<TaxResponse[]>('/taxes/disabled')
    return data
  },
  /** Reactiva (enabled=true) un impuesto pausado. */
  async enable(id: number): Promise<TaxResponse> {
    const { data } = await http.patch<TaxResponse>(`/taxes/${id}/enable`)
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

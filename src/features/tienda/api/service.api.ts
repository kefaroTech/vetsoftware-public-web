import type { PageResponse } from '@/types/pagination'
import { http } from '@/services/http/http.client'
import type { ServicePayload, ServiceResponse, ServiceSearchCriteria } from '../types/tienda'

export const serviceApi = {
  async listAll(): Promise<ServiceResponse[]> {
    const { data } = await http.get<ServiceResponse[]>('/services')
    return data
  },

  async search(criteria: ServiceSearchCriteria): Promise<PageResponse<ServiceResponse>> {
    const params: Record<string, string | number> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.name) params.name = criteria.name
    if (criteria.serviceCategoryId != null) params.serviceCategoryId = criteria.serviceCategoryId
    if (criteria.taxId != null) params.taxId = criteria.taxId
    const { data } = await http.get<PageResponse<ServiceResponse>>('/services/search', { params })
    return data
  },

  async findById(id: number): Promise<ServiceResponse> {
    const { data } = await http.get<ServiceResponse>(`/services/${id}`)
    return data
  },

  /** Servicios pausados (enabled=false) de la empresa, para reactivarlos. */
  async listDisabled(): Promise<ServiceResponse[]> {
    const { data } = await http.get<ServiceResponse[]>('/services/disabled')
    return data
  },

  /** Reactiva (enabled=true) un servicio pausado. */
  async enable(id: number): Promise<ServiceResponse> {
    const { data } = await http.patch<ServiceResponse>(`/services/${id}/enable`)
    return data
  },

  async create(payload: ServicePayload): Promise<ServiceResponse> {
    const { data } = await http.post<ServiceResponse>('/services', payload)
    return data
  },

  async update(id: number, payload: ServicePayload): Promise<ServiceResponse> {
    const { data } = await http.put<ServiceResponse>(`/services/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/services/${id}`)
  },
}

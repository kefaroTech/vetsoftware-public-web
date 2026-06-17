import { http } from '@/services/http/http.client'
import type {
  OpenAccountResponse,
  OpenAccountSearchCriteria,
  OpenAccountStatus,
  PageResponse,
} from '../types/cuentas'

export const openAccountApi = {
  async listAll(): Promise<OpenAccountResponse[]> {
    const { data } = await http.get<OpenAccountResponse[]>('/open-accounts')
    return data
  },

  async search(criteria: OpenAccountSearchCriteria): Promise<PageResponse<OpenAccountResponse>> {
    const params: Record<string, string | number | boolean> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.ownerId != null) params.ownerId = criteria.ownerId
    if (criteria.enabled != null) params.enabled = criteria.enabled
    const { data } = await http.get<PageResponse<OpenAccountResponse>>('/open-accounts/search', { params })
    return data
  },

  async findById(id: number): Promise<OpenAccountResponse> {
    const { data } = await http.get<OpenAccountResponse>(`/open-accounts/${id}`)
    return data
  },

  async create(ownerId: number): Promise<OpenAccountResponse> {
    const { data } = await http.post<OpenAccountResponse>('/open-accounts', { ownerId })
    return data
  },

  async changeStatus(
    id: number,
    status: OpenAccountStatus,
    reason?: string,
    // Solo relevantes al CERRAR (CLOSE): disparan la auto-emisión del documento DIAN.
    documentType?: 'FE_VENTA' | 'DOC_EQUIV_POS',
    finalConsumer?: boolean,
  ): Promise<OpenAccountResponse> {
    const { data } = await http.patch<OpenAccountResponse>(`/open-accounts/${id}/status`, {
      status,
      reason,
      documentType,
      finalConsumer,
    })
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/open-accounts/${id}`)
  },
}

import { http } from '@/services/http/http.client'
import type { ReconciliationResponse, SalesBookResponse } from '../types/facturacion'

export const salesReportApi = {
  async salesBook(from: string, to: string): Promise<SalesBookResponse> {
    const { data } = await http.get<SalesBookResponse>('/sales-reports/sales-book', {
      params: { from, to },
    })
    return data
  },

  async reconciliation(from: string, to: string): Promise<ReconciliationResponse> {
    const { data } = await http.get<ReconciliationResponse>('/sales-reports/reconciliation', {
      params: { from, to },
    })
    return data
  },
}

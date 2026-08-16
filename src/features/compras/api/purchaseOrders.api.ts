import type { PurchaseOrderSearchParams } from '../types/purchaseOrders.types'
import { http } from '@/services/http/http.client'
import { withBranchBody } from '@/features/branches/api/branchContext'
import type { PageResponse, PurchaseOrder, PurchaseOrderRequest } from '../types/compras'

// Órdenes de compra (backend: /purchase-orders). Ciclo DRAFT → PLACED → PARTIALLY_RECEIVED/RECEIVED.

export const purchaseOrdersApi = {
  /**
   * Listado paginado. Apunta a `/search`, que ya existia y si pagina, en vez de
   * a `GET /purchase-orders`, que devuelve la coleccion entera (BE-06).
   */
  async search(params: PurchaseOrderSearchParams = {}): Promise<PageResponse<PurchaseOrder>> {
    const { data } = await http.get<PageResponse<PurchaseOrder>>('/purchase-orders/search', {
      params,
    })
    return data
  },
  async findById(id: number): Promise<PurchaseOrder> {
    const { data } = await http.get<PurchaseOrder>(`/purchase-orders/${id}`)
    return data
  },
  async create(payload: PurchaseOrderRequest): Promise<PurchaseOrder> {
    const { data } = await http.post<PurchaseOrder>('/purchase-orders', withBranchBody(payload))
    return data
  },
  async update(id: number, payload: PurchaseOrderRequest): Promise<PurchaseOrder> {
    const { data } = await http.put<PurchaseOrder>(
      `/purchase-orders/${id}`,
      withBranchBody(payload),
    )
    return data
  },
  async place(id: number): Promise<PurchaseOrder> {
    const { data } = await http.post<PurchaseOrder>(`/purchase-orders/${id}/place`, {})
    return data
  },
  async cancel(id: number): Promise<PurchaseOrder> {
    const { data } = await http.post<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {})
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/purchase-orders/${id}`)
  },
}

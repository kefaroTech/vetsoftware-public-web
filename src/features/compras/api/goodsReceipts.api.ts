import type { GoodsReceiptSearchParams } from '../types/goodsReceipts.types'
import { http } from '@/services/http/http.client'
import { withBranchBody } from '@/features/branches/api/branchContext'
import type { PageResponse } from '@/types/pagination'
import type { GoodsReceipt, GoodsReceiptRequest } from '../types/compras'

// Recepciones de mercancía (backend: /goods-receipts). CONFIRMAR alimenta inventario; ANULAR lo revierte.

export const goodsReceiptsApi = {
  /**
   * Listado paginado. Apunta a `/search`, que ya existia y si pagina, en vez de
   * a `GET /goods-receipts`, que devuelve la coleccion entera (BE-06).
   */
  async search(params: GoodsReceiptSearchParams = {}): Promise<PageResponse<GoodsReceipt>> {
    const { data } = await http.get<PageResponse<GoodsReceipt>>('/goods-receipts/search', {
      params,
    })
    return data
  },
  async findById(id: number): Promise<GoodsReceipt> {
    const { data } = await http.get<GoodsReceipt>(`/goods-receipts/${id}`)
    return data
  },
  async create(payload: GoodsReceiptRequest): Promise<GoodsReceipt> {
    const { data } = await http.post<GoodsReceipt>('/goods-receipts', withBranchBody(payload))
    return data
  },
  async confirm(id: number): Promise<GoodsReceipt> {
    const { data } = await http.post<GoodsReceipt>(`/goods-receipts/${id}/confirm`, {})
    return data
  },
  async cancel(id: number): Promise<GoodsReceipt> {
    const { data } = await http.post<GoodsReceipt>(`/goods-receipts/${id}/cancel`, {})
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/goods-receipts/${id}`)
  },
}

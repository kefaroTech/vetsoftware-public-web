import { http } from '@/services/http/http.client'
import type { PageResponse } from '../types/tienda'
import type {
  AdjustStockPayload,
  ConsumeStockPayload,
  InventoryAlertsView,
  InventoryValuationView,
  PurchaseView,
  ReceiveStockPayload,
  StockLotView,
  StockMovementView,
  StockSearchCriteria,
  StockView,
  TransferStockPayload,
} from '../types/inventory'

/** Cliente del inventario por sede (backend feature `inventory`, F3). */
export const inventoryApi = {
  async searchStock(criteria: StockSearchCriteria): Promise<PageResponse<StockView>> {
    const params: Record<string, string | number | boolean> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.branchId != null) params.branchId = criteria.branchId
    if (criteria.q) params.q = criteria.q
    if (criteria.lowStock) params.lowStock = true
    const { data } = await http.get<PageResponse<StockView>>('/inventory/stock', { params })
    return data
  },

  async lots(productId: number, branchId?: number | null): Promise<StockLotView[]> {
    const params: Record<string, number> = {}
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<StockLotView[]>(`/inventory/products/${productId}/lots`, { params })
    return data
  },

  async kardex(
    productId: number,
    opts: { branchId?: number | null; from?: string | null; to?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PageResponse<StockMovementView>> {
    const params: Record<string, string | number> = {
      page: opts.page ?? 0,
      pageSize: opts.pageSize ?? 20,
    }
    if (opts.branchId != null) params.branchId = opts.branchId
    if (opts.from) params.from = opts.from
    if (opts.to) params.to = opts.to
    const { data } = await http.get<PageResponse<StockMovementView>>(
      `/inventory/products/${productId}/kardex`,
      { params },
    )
    return data
  },

  async receive(payload: ReceiveStockPayload): Promise<void> {
    await http.post('/inventory/receipts', payload)
  },

  async adjust(payload: AdjustStockPayload): Promise<void> {
    await http.post('/inventory/adjustments', payload)
  },

  async transfer(payload: TransferStockPayload): Promise<void> {
    await http.post('/inventory/transfers', payload)
  },

  async setMinStock(productId: number, branchId: number | null | undefined, minStock: number): Promise<void> {
    await http.put(`/inventory/products/${productId}/min-stock`, { branchId, minStock })
  },

  // ── F5 ──
  async alerts(branchId?: number | null, expiringInDays = 30): Promise<InventoryAlertsView> {
    const params: Record<string, number> = { expiringInDays }
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<InventoryAlertsView>('/inventory/alerts', { params })
    return data
  },

  async valuation(branchId?: number | null): Promise<InventoryValuationView> {
    const params: Record<string, number> = {}
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<InventoryValuationView>('/inventory/valuation', { params })
    return data
  },

  // ── F6 ──
  async consume(payload: ConsumeStockPayload): Promise<void> {
    await http.post('/inventory/consumptions', payload)
  },

  async purchases(
    opts: { branchId?: number | null; from?: string | null; to?: string | null; page?: number; pageSize?: number } = {},
  ): Promise<PageResponse<PurchaseView>> {
    const params: Record<string, string | number> = { page: opts.page ?? 0, pageSize: opts.pageSize ?? 20 }
    if (opts.branchId != null) params.branchId = opts.branchId
    if (opts.from) params.from = opts.from
    if (opts.to) params.to = opts.to
    const { data } = await http.get<PageResponse<PurchaseView>>('/inventory/purchases', { params })
    return data
  },
}

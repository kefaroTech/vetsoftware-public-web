import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  AdjustStockPayload,
  ConsumeStockPayload,
  InventoryAlertsView,
  InventoryCountView,
  InventoryValuationView,
  PurchaseView,
  ReceiveStockPayload,
  RecordCountPayload,
  StockLotView,
  StockMovementView,
  StockSearchCriteria,
  StockView,
  TransferStockPayload,
} from '../types/inventory'

/** Cliente del inventario por sede (backend feature `inventory`, F3). */
export const inventoryApi = {
  async searchStock(
    criteria: StockSearchCriteria,
    signal?: AbortSignal,
  ): Promise<PageResponse<StockView>> {
    const params: Record<string, string | number | boolean> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.branchId != null) params.branchId = criteria.branchId
    if (criteria.q) params.q = criteria.q
    if (criteria.lowStock) params.lowStock = true
    const { data } = await http.get<PageResponse<StockView>>('/inventory/stock', {
      params,
      signal,
    })
    return data
  },

  async lots(productId: number, branchId?: number | null): Promise<StockLotView[]> {
    const params: Record<string, number> = {}
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<StockLotView[]>(`/inventory/products/${productId}/lots`, {
      params,
    })
    return data
  },

  async kardex(
    productId: number,
    opts: {
      branchId?: number | null
      from?: string | null
      to?: string | null
      page?: number
      pageSize?: number
    } = {},
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

  async setMinStock(
    productId: number,
    branchId: number | null | undefined,
    minStock: number,
  ): Promise<void> {
    await http.put(`/inventory/products/${productId}/min-stock`, { branchId, minStock })
  },

  // ── F5 ──
  async alerts(
    branchId?: number | null,
    expiringInDays = 30,
    signal?: AbortSignal,
  ): Promise<InventoryAlertsView> {
    const params: Record<string, number> = { expiringInDays }
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<InventoryAlertsView>('/inventory/alerts', { params, signal })
    return data
  },

  async valuation(branchId?: number | null, signal?: AbortSignal): Promise<InventoryValuationView> {
    const params: Record<string, number> = {}
    if (branchId != null) params.branchId = branchId
    const { data } = await http.get<InventoryValuationView>('/inventory/valuation', {
      params,
      signal,
    })
    return data
  },

  // ── F6 ──
  async consume(payload: ConsumeStockPayload): Promise<void> {
    await http.post('/inventory/consumptions', payload)
  },

  async purchases(
    opts: {
      branchId?: number | null
      from?: string | null
      to?: string | null
      page?: number
      pageSize?: number
    } = {},
  ): Promise<PageResponse<PurchaseView>> {
    const params: Record<string, string | number> = {
      page: opts.page ?? 0,
      pageSize: opts.pageSize ?? 20,
    }
    if (opts.branchId != null) params.branchId = opts.branchId
    if (opts.from) params.from = opts.from
    if (opts.to) params.to = opts.to
    const { data } = await http.get<PageResponse<PurchaseView>>('/inventory/purchases', { params })
    return data
  },

  // ── Conteo físico / cíclico ──
  async recordCount(payload: RecordCountPayload): Promise<InventoryCountView> {
    const { data } = await http.post<InventoryCountView>('/inventory/counts', payload)
    return data
  },

  async counts(
    opts: { branchId?: number | null; page?: number; pageSize?: number } = {},
  ): Promise<PageResponse<InventoryCountView>> {
    const params: Record<string, string | number> = {
      page: opts.page ?? 0,
      pageSize: opts.pageSize ?? 20,
    }
    if (opts.branchId != null) params.branchId = opts.branchId
    const { data } = await http.get<PageResponse<InventoryCountView>>('/inventory/counts', {
      params,
    })
    return data
  },

  async countDetail(id: number): Promise<InventoryCountView> {
    const { data } = await http.get<InventoryCountView>(`/inventory/counts/${id}`)
    return data
  },

  // ── Export (CSV/PDF) ──
  async exportKardex(
    productId: number,
    opts: {
      branchId?: number | null
      from?: string | null
      to?: string | null
      format: 'csv' | 'pdf'
    },
  ): Promise<void> {
    const params: Record<string, string | number> = { format: opts.format }
    if (opts.branchId != null) params.branchId = opts.branchId
    if (opts.from) params.from = opts.from
    if (opts.to) params.to = opts.to
    const res = await http.get(`/inventory/products/${productId}/kardex/export`, {
      params,
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    saveFile(
      res.data as Blob,
      res.headers['content-disposition'],
      `kardex_${productId}.${opts.format}`,
    )
  },

  async exportPurchases(opts: {
    branchId?: number | null
    from?: string | null
    to?: string | null
    format: 'csv' | 'pdf'
  }): Promise<void> {
    const params: Record<string, string | number> = { format: opts.format }
    if (opts.branchId != null) params.branchId = opts.branchId
    if (opts.from) params.from = opts.from
    if (opts.to) params.to = opts.to
    const res = await http.get('/inventory/purchases/export', {
      params,
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    saveFile(res.data as Blob, res.headers['content-disposition'], `compras.${opts.format}`)
  },
}

/** Dispara la descarga del blob, tomando el nombre del header Content-Disposition si viene. */
function saveFile(blob: Blob, contentDisposition: string | undefined, fallback: string) {
  let filename = fallback
  const match = contentDisposition?.match(/filename="([^"]+)"/)
  if (match?.[1]) filename = match[1]
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

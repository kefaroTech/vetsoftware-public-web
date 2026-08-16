/**
 * Tipos del inventario por sede (feature backend `inventory`, F3). El stock ya NO vive en el producto:
 * saldo/mínimo por sede (StockView), lotes (StockLotView) y kardex (StockMovementView).
 */

/** Espejo de com.vetsoftware.app.inventory.application.dto.StockView (saldo por producto+sede). */
export interface StockView {
  productId: number
  productName: string
  productCode: string
  branchId: number
  branchName: string
  quantity: number
  minStock: number
  lowStock: boolean
}

/** Espejo de StockLotView (lote disponible, FEFO). */
export interface StockLotView {
  lotId: number
  lotNumber: string | null
  /** ISO `yyyy-MM-dd` o null. */
  expireDate: string | null
  quantityAvailable: number
  unitCost: number
}

/** Espejo de StockMovementView (asiento del kardex). `quantity` con signo (+entra/−sale). */
export interface StockMovementView {
  id: number
  lotId: number
  type: string
  quantity: number
  unitCost: number
  referenceType: string
  referenceId: number | null
  reason: string | null
  createdBy: number | null
  /** ISO datetime. */
  createdDate: string
}

// ── Payloads de escritura ────────────────────────────────────────────────────

/** Entrada de mercancía (recepción). branchId opcional: null = sede única/Principal según alcance. */
export interface ReceiveStockPayload {
  branchId?: number | null
  productId: number
  quantity: number
  unitCost: number
  lotNumber?: string | null
  expireDate?: string | null
}

/** Ajuste por conteo físico. delta con signo (≠0); unitCost solo aplica si delta>0. */
export interface AdjustStockPayload {
  branchId?: number | null
  productId: number
  delta: number
  unitCost?: number | null
  reason: string
}

/** Transferencia entre sedes. */
export interface TransferStockPayload {
  fromBranchId: number
  toBranchId: number
  productId: number
  quantity: number
  reason?: string | null
}

/** Filtros de la búsqueda paginada de saldo. */
export interface StockSearchCriteria {
  branchId?: number | null
  q?: string | null
  lowStock?: boolean
  page?: number
  pageSize?: number
}

// ── F5: alertas + valuación ───────────────────────────────────────────────────

/** Lote por vencer (o vencido). daysToExpire negativo = ya vencido. */
export interface ExpiringLotView {
  productId: number
  productName: string
  productCode: string
  branchId: number
  branchName: string
  lotId: number
  lotNumber: string | null
  expireDate: string
  quantityAvailable: number
  daysToExpire: number
}

export interface InventoryAlertsView {
  lowStock: StockView[]
  expiring: ExpiringLotView[]
}

export interface ProductValuationView {
  productId: number
  productName: string
  productCode: string
  quantity: number
  value: number
}

export interface InventoryValuationView {
  totalValue: number
  totalUnits: number
  byProduct: ProductValuationView[]
}

// ── F6: consumo clínico + libro de compras ────────────────────────────────────

/** Consumo clínico manual de un producto desde una sede. */
export interface ConsumeStockPayload {
  branchId?: number | null
  productId: number
  quantity: number
  reason?: string | null
}

// ── Conteo físico / cíclico ───────────────────────────────────────────────────

/** Línea de una sesión de conteo: sistema vs contado y la diferencia (ajuste) resultante. */
export interface InventoryCountLineView {
  productId: number
  systemQuantity: number
  countedQuantity: number
  difference: number
}

/**
 * Espejo de InventoryCountView. En el listado (historial) `lines` viene vacío y se usan los contadores
 * agregados; en el detalle y al confirmar trae las líneas con sus diferencias.
 */
export interface InventoryCountView {
  id: number
  branchId: number
  note: string | null
  countedBy: number | null
  createdDate: string
  totalLines: number
  adjustedLines: number
  lines: InventoryCountLineView[]
}

/** Hoja de conteo a confirmar: solo las líneas efectivamente contadas. */
export interface RecordCountPayload {
  branchId: number
  note?: string | null
  lines: { productId: number; countedQuantity: number }[]
}

/** Renglón del libro de compras (entrada de mercancía con costo). */
export interface PurchaseView {
  id: number
  productId: number
  productName: string
  productCode: string
  lotId: number
  branchId: number
  branchName: string
  quantity: number
  unitCost: number
  total: number
  referenceId: number | null
  createdDate: string
}

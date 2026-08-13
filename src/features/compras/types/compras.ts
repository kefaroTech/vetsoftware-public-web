// Tipos del módulo Compras (punto 7). Espejan los DTOs del backend:
// features supplier, purchaseorder, goodsreceipt, supplierinvoice, purchasereport.

export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

// ── Proveedores (supplier) ────────────────────────────────────────────────
export interface Supplier {
  id: number
  name: string
  taxId: string | null
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  paymentTermsDays: number | null
  notes: string | null
  version: number
  enabled: boolean
}

export interface SupplierRequest {
  name: string
  taxId?: string | null
  contactName?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  paymentTermsDays?: number | null
  notes?: string | null
}

// ── Facturas de proveedor / CxP (supplierinvoice) ─────────────────────────
export type SupplierInvoiceStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED'
export type SupplierPaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'

export interface SupplierSummary {
  id: number
  name: string
  taxId: string | null
}
export interface BranchSummary {
  id: number
  name: string
}

export interface SupplierInvoicePayment {
  /** TR-01: es la clave de la fila; el backend nunca la devuelve nula. */
  id: number
  amount: number
  paymentDate: string
  method: SupplierPaymentMethod
  reference: string | null
  note: string | null
  createdDate: string
  createdBy: number | null
}

export interface SupplierInvoice {
  id: number
  branch: BranchSummary
  supplier: SupplierSummary
  purchaseOrderId: number | null
  goodsReceiptId: number | null
  invoiceNumber: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  withholdingAmount: number
  total: number
  payableAmount: number
  paidAmount: number
  balance: number
  status: SupplierInvoiceStatus
  notes: string | null
  payments: SupplierInvoicePayment[]
  version: number
  enabled: boolean
}

export interface SupplierInvoiceRequest {
  branchId?: number | null
  supplierId: number
  purchaseOrderId?: number | null
  goodsReceiptId?: number | null
  invoiceNumber: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  withholdingAmount?: number | null
  notes?: string | null
  version?: number
}

export interface RegisterSupplierPaymentRequest {
  amount: number
  paymentDate: string
  method: SupplierPaymentMethod
  reference?: string | null
  note?: string | null
  version: number
}

export interface AgingBucket {
  current: number
  days1to30: number
  days31to60: number
  days61to90: number
  over90: number
  total: number
}
export interface AgingSupplierRow {
  supplierId: number
  supplierName: string
  taxId: string | null
  bucket: AgingBucket
}
export interface AccountsPayableAging {
  asOf: string
  suppliers: AgingSupplierRow[]
  totals: AgingBucket
}

// ── Órdenes de compra (purchaseorder) ─────────────────────────────────────
export type PurchaseOrderStatus =
  'DRAFT' | 'PLACED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface ProductSummary {
  id: number
  name: string
  code: string
}

export interface PurchaseOrderLine {
  /** TR-01: es la clave de la fila; el backend nunca la devuelve nula. */
  id: number
  product: ProductSummary
  quantityOrdered: number
  unitCost: number
  quantityReceived: number
  pendingQuantity: number
  fullyReceived: boolean
}

export interface PurchaseOrder {
  id: number
  branch: BranchSummary
  supplier: SupplierSummary
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate: string | null
  notes: string | null
  lines: PurchaseOrderLine[]
  version: number
  enabled: boolean
}

export interface PurchaseOrderLineRequest {
  productId: number
  quantityOrdered: number
  unitCost: number
}
export interface PurchaseOrderRequest {
  branchId?: number | null
  supplierId: number
  orderDate: string
  expectedDate?: string | null
  notes?: string | null
  lines: PurchaseOrderLineRequest[]
  version?: number
}

// ── Recepciones de mercancía (goodsreceipt) ───────────────────────────────
export type GoodsReceiptStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED'

export interface GoodsReceiptLine {
  /** TR-01: es la clave de la fila; el backend nunca la devuelve nula. */
  id: number
  product: ProductSummary
  purchaseOrderLineId: number | null
  lotNumber: string | null
  expireDate: string | null
  quantityReceived: number
  unitCost: number
}

export interface GoodsReceipt {
  id: number
  branch: BranchSummary
  supplier: SupplierSummary
  purchaseOrderId: number | null
  receiptDate: string
  supplierInvoiceNumber: string | null
  notes: string | null
  status: GoodsReceiptStatus
  lines: GoodsReceiptLine[]
  version: number
  enabled: boolean
}

export interface GoodsReceiptLineRequest {
  productId: number
  purchaseOrderLineId?: number | null
  lotNumber?: string | null
  expireDate?: string | null
  quantityReceived: number
  unitCost: number
}
export interface GoodsReceiptRequest {
  branchId?: number | null
  supplierId: number
  purchaseOrderId?: number | null
  receiptDate: string
  supplierInvoiceNumber?: string | null
  notes?: string | null
  lines: GoodsReceiptLineRequest[]
}

// ── Libro de compras (purchasereport) ─────────────────────────────────────
export interface PurchaseBookEntry {
  id: number
  supplierName: string
  supplierTaxId: string | null
  invoiceNumber: string
  issueDate: string
  dueDate: string
  subtotal: number
  taxAmount: number
  withholdingAmount: number
  total: number
  paidAmount: number
  balance: number
  status: string
}
export interface PurchaseBookTotals {
  invoiceCount: number
  subtotal: number
  taxAmount: number
  withholdingAmount: number
  total: number
  paidAmount: number
  balance: number
}
export interface PurchaseBook {
  dateFrom: string
  dateTo: string
  entries: PurchaseBookEntry[]
  totals: PurchaseBookTotals
}

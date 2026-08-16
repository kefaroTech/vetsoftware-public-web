import type { SupplierInvoiceStatus } from '../types/compras'

export interface SupplierInvoiceSearchParams {
  supplierId?: number
  status?: SupplierInvoiceStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

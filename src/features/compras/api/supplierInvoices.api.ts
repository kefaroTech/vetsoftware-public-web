import { http } from '@/services/http/http.client'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'
import type {
  AccountsPayableAging,
  PageResponse,
  RegisterSupplierPaymentRequest,
  SupplierInvoice,
  SupplierInvoiceRequest,
  SupplierInvoiceStatus,
} from '../types/compras'

// Facturas de proveedor / cuentas por pagar (backend: /supplier-invoices). La sede va como contexto
// multi-sucursal (body en escrituras, query en lecturas). El backend la acota por el alcance del empleado.

export interface SupplierInvoiceSearchParams {
  supplierId?: number
  status?: SupplierInvoiceStatus
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const supplierInvoicesApi = {
  async search(params: SupplierInvoiceSearchParams = {}): Promise<PageResponse<SupplierInvoice>> {
    const { data } = await http.get<PageResponse<SupplierInvoice>>('/supplier-invoices/search', {
      params: withBranchParam({ ...params }),
    })
    return data
  },

  async findById(id: number): Promise<SupplierInvoice> {
    const { data } = await http.get<SupplierInvoice>(`/supplier-invoices/${id}`)
    return data
  },

  async create(payload: SupplierInvoiceRequest): Promise<SupplierInvoice> {
    const { data } = await http.post<SupplierInvoice>('/supplier-invoices', withBranchBody(payload))
    return data
  },

  async update(id: number, payload: SupplierInvoiceRequest): Promise<SupplierInvoice> {
    const { data } = await http.put<SupplierInvoice>(
      `/supplier-invoices/${id}`,
      withBranchBody(payload),
    )
    return data
  },

  async registerPayment(
    id: number,
    payload: RegisterSupplierPaymentRequest,
  ): Promise<SupplierInvoice> {
    const { data } = await http.post<SupplierInvoice>(`/supplier-invoices/${id}/payments`, payload)
    return data
  },

  async cancel(id: number): Promise<SupplierInvoice> {
    const { data } = await http.post<SupplierInvoice>(`/supplier-invoices/${id}/cancel`, {})
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/supplier-invoices/${id}`)
  },

  async aging(asOf?: string): Promise<AccountsPayableAging> {
    const { data } = await http.get<AccountsPayableAging>('/supplier-invoices/aging', {
      params: withBranchParam(asOf ? { asOf } : {}),
    })
    return data
  },
}

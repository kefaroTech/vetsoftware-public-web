import type { SupplierInvoiceStatus, SupplierPaymentMethod } from '../types/compras'

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatMoney(value: number | null | undefined): string {
  return money.format(value ?? 0)
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CO', {
    dateStyle: 'medium',
  })
}

const STATUS_LABELS: Record<SupplierInvoiceStatus, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagada',
  CANCELLED: 'Anulada',
}
export function invoiceStatusLabel(status: SupplierInvoiceStatus): string {
  return STATUS_LABELS[status]
}

const METHOD_LABELS: Record<SupplierPaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
}
export function paymentMethodLabel(method: SupplierPaymentMethod): string {
  return METHOD_LABELS[method]
}

export const PAYMENT_METHOD_OPTIONS: { value: SupplierPaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'OTHER', label: 'Otro' },
]

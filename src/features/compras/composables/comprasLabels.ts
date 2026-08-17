/**
 * Vocabulario de Compras: estados de factura de proveedor y métodos de pago.
 *
 * Es lo único de aquel `composables/format.ts` que era genuinamente de esta
 * feature. El formato de fecha (`formatDateNumeric`) y el de importe
 * (`formatMoney`) eran duplicados y viven donde tienen que vivir:
 * `@/composables/format` y `@/features/tienda/composables/pricing`.
 */
import type { SupplierInvoiceStatus, SupplierPaymentMethod } from '../types/compras'

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

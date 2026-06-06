/**
 * Tipos del módulo Cuentas abiertas (facturación a cuenta). Espejo de los DTOs
 * del backend (com.vetsoftware.app.{openaccount,productchargeopenaccount,
 * servicechargeopenaccount,generalchargeopenaccount,debtopenaccount}).
 *
 * Notas de modelo (ver plan §Restricciones):
 * - La cuenta pertenece al PROPIETARIO (ownerId); no guarda `origen`.
 * - Los cargos de producto/servicio llevan `animalId` (cargo por mascota);
 *   los cargos generales NO (bucket "General").
 * - El total/saldo lo calcula el backend (totalAmount/paidAmount/outstandingAmount).
 */

export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export interface OwnerSummary {
  id: number
  name: string
  document?: string
}

export interface AnimalSummary {
  id: number
  name: string
  code?: string
}

export interface EmployeeSummary {
  id: number
  name: string
  employeeCode?: string
}

export interface CompanySummary {
  id: number
  name: string
  identifier: string
}

export interface TaxSummary {
  id: number
  name: string
  percentage: number
}

// ── Cuenta ───────────────────────────────────────────────────────────────────

/** Espejo del estado de la cuenta en el backend. "Abierta" = status === 'OPEN'. */
export type OpenAccountStatus = 'OPEN' | 'CLOSE' | 'CANCEL'

export const OPEN_ACCOUNT_STATUS_LABEL: Record<OpenAccountStatus, string> = {
  OPEN: 'Abierta',
  CLOSE: 'Cerrada',
  CANCEL: 'Cancelada',
}

export interface OpenAccountResponse {
  id: number
  owner: OwnerSummary
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  status: OpenAccountStatus
  company: CompanySummary
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
  /** Trazabilidad de cierre (presentes cuando status !== OPEN). */
  closedBy?: EmployeeSummary | null
  closedAt?: string | null
  closeReason?: string | null
}

export interface OpenAccountSearchCriteria {
  ownerId?: number | null
  enabled?: boolean | null
  page?: number
  pageSize?: number
}

// ── Cargos ───────────────────────────────────────────────────────────────────

export interface ChargeAccountRef {
  id: number
}

export interface ProductChargeResponse {
  id: number
  animal: AnimalSummary
  product: { id: number; name: string; salePrice?: number }
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface ServiceChargeResponse {
  id: number
  animal: AnimalSummary
  service: { id: number; name: string; price?: number }
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface GeneralChargeResponse {
  id: number
  name: string
  unitAmount: number
  quantity: number
  tax: TaxSummary | null
  hasTax: boolean
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface CreateProductChargePayload {
  animalId: number
  productId: number
  openAccountId: number
}

export interface CreateServiceChargePayload {
  animalId: number
  serviceId: number
  openAccountId: number
}

export interface CreateGeneralChargePayload {
  name: string
  unitAmount: number
  quantity: number
  taxId?: number | null
  hasTax: boolean
  openAccountId: number
}

// ── Pagos / abonos (DebtOpenAccount) ─────────────────────────────────────────

/** Espejo del enum PaymentMethod del backend (com.vetsoftware...PaymentMethod). */
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER'

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  BANK_TRANSFER: 'Transferencia',
}

export interface DebtResponse {
  id: number
  amount: number
  paymentMethod: PaymentMethod
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface CreateDebtPayload {
  amount: number
  paymentMethod: PaymentMethod
  openAccountId: number
}

// ── Vista unificada de un cargo (para agrupar por mascota en la UI) ──────────

export type ChargeKind = 'product' | 'service' | 'general'

export interface UnifiedCharge {
  id: number
  kind: ChargeKind
  /** animalId del cargo, o null para "General". */
  animalId: number | null
  animalName: string | null
  concept: string
  amount: number
  date: string
}

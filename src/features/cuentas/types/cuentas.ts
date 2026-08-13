/**
 * Tipos del módulo Cuentas abiertas (facturación a cuenta). Espejo de los DTOs
 * del backend (com.vetsoftware.app.{openaccount,productchargeopenaccount,
 * servicechargeopenaccount,generalchargeopenaccount,debtopenaccount}).
 *
 * Notas de modelo (ver plan §Restricciones):
 * - La cuenta pertenece al PROPIETARIO (ownerId); no guarda `origen`.
 * - Cada cuenta pertenece a una SEDE; un propietario puede tener una cuenta OPEN por sede.
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

export interface BranchSummary {
  id: number
  name: string
  code: string
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
  branch: BranchSummary
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
  /** Trazabilidad de cierre (presentes cuando status !== OPEN). */
  closedBy?: EmployeeSummary | null
  closedAt?: string | null
  closeReason?: string | null
  /**
   * Versión optimista (@Version del backend). Se reenvía como `expectedVersion` en las mutaciones
   * de la cuenta para detección temprana de conflicto: si otra operación la modificó desde que el
   * front la leyó, el backend responde 409 CONCURRENT_MODIFICATION sin tocar datos.
   */
  version: number
}

export interface OpenAccountSearchCriteria {
  ownerId?: number | null
  enabled?: boolean | null
  /**
   * Estados admitidos; vacío = todos. Es una lista porque la pestaña "Cerradas" son dos estados
   * a la vez (`CLOSE` y `CANCEL`). Viaja como `status` repetido en la query.
   */
  statuses?: OpenAccountStatus[]
  /** Texto libre sobre nombre o documento del propietario. */
  q?: string
  page?: number
  pageSize?: number
}

/**
 * Totales de la pantalla de cuentas, calculados en el servidor (BE-06).
 *
 * <p>Se sumaban en el cliente recorriendo el array completo. Con la lista paginada eso dejaría
 * de ser cierto: el banner mostraría el saldo de las cuentas cargadas, no el de la empresa.
 */
export interface OpenAccountsSummary {
  openCount: number
  closedCount: number
  totalOutstanding: number
}

// ── Cargos ───────────────────────────────────────────────────────────────────

export interface ChargeAccountRef {
  id: number
}

/** Trazabilidad de anulación de un cargo (presente cuando voided=true). */
export interface ChargeVoidInfo {
  /** El cargo anulado sigue enabled=true pero voided=true (queda visible tachado). */
  voided: boolean
  voidedBy?: EmployeeSummary | null
  voidedAt?: string | null
  voidReason?: string | null
}

export interface ProductChargeResponse extends ChargeVoidInfo {
  id: number
  animal: AnimalSummary
  /** `salePrice` es el precio ACTUAL del catálogo (informativo); usar `unitPrice` para el monto. */
  product: { id: number; name: string; salePrice?: number }
  /** Precio unitario congelado al crear el cargo (snapshot del backend). */
  unitPrice: number
  /** Unidades cobradas (>= 1). El total de la línea es `unitPrice * quantity`. */
  quantity: number
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface ServiceChargeResponse extends ChargeVoidInfo {
  id: number
  animal: AnimalSummary
  /** `price` es el precio ACTUAL del catálogo (informativo); usar `unitPrice` para el monto. */
  service: { id: number; name: string; price?: number }
  /** Precio unitario congelado al crear el cargo (snapshot del backend). */
  unitPrice: number
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface GeneralChargeResponse extends ChargeVoidInfo {
  id: number
  name: string
  unitAmount: number
  quantity: number
  tax: TaxSummary | null
  hasTax: boolean
  /** Porcentaje de impuesto congelado al crear el cargo; null si no aplica. */
  taxPercentage?: number | null
  openAccount: ChargeAccountRef
  createdBy: EmployeeSummary
  createdDate: string
  enabled: boolean
}

export interface CreateProductChargePayload {
  animalId: number
  productId: number
  openAccountId: number
  /** Unidades a cobrar (entero >= 1). Opcional: el backend usa 1 si se omite. */
  quantity?: number
  /** Idempotency key (UUID) opcional: deduplica reintentos del mismo cargo en el backend. */
  clientRequestId?: string
  /** Versión esperada de la cuenta (opt-in): detección temprana de conflicto de concurrencia. */
  expectedVersion?: number
}

export interface CreateServiceChargePayload {
  animalId: number
  serviceId: number
  openAccountId: number
  /** Idempotency key (UUID) opcional: deduplica reintentos del mismo cargo en el backend. */
  clientRequestId?: string
  /** Versión esperada de la cuenta (opt-in): detección temprana de conflicto de concurrencia. */
  expectedVersion?: number
}

export interface CreateGeneralChargePayload {
  name: string
  unitAmount: number
  quantity: number
  taxId?: number | null
  hasTax: boolean
  openAccountId: number
  /** Idempotency key (UUID) opcional: deduplica reintentos del mismo cargo en el backend. */
  clientRequestId?: string
  /** Versión esperada de la cuenta (opt-in): detección temprana de conflicto de concurrencia. */
  expectedVersion?: number
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
  /** Trazabilidad de anulación. El abono anulado sigue enabled=true pero voided=true. */
  voided: boolean
  voidedBy?: EmployeeSummary | null
  voidedAt?: string | null
  voidReason?: string | null
}

export interface CreateDebtPayload {
  amount: number
  paymentMethod: PaymentMethod
  openAccountId: number
  /** Idempotency key (UUID) opcional para deduplicar reintentos del mismo cobro. */
  clientRequestId?: string
  /** Versión esperada de la cuenta (opt-in): detección temprana de conflicto de concurrencia. */
  expectedVersion?: number
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
  /** Monto total de la línea (unitPrice * quantity para producto; unitAmount * quantity para general). */
  amount: number
  /** Unidades cobradas (>= 1). Service siempre 1; product/general traen su cantidad real. */
  quantity: number
  date: string
  /** Autoría del cargo (cajero que lo registró). */
  createdByName: string
  /** Anulado: queda visible tachado y deja de contar en el total. */
  voided: boolean
  voidedByName: string
  voidReason: string
}

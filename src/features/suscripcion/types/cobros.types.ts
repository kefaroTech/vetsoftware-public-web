/**
 * Cuentas de cobro, cargos, pagos, saldo a favor y avisos de cobranza.
 *
 * <p><b>Declarar no es enseñar.</b> El guardián del contrato obliga a declarar todos los campos
 * del esquema, así que aquí aparecen `documentNumber`, `gatewayReference`, `externalProvider` y
 * compañía. **Ninguno se pinta**: el cliente ve su factura fiscal (`externalInvoiceNumber`), no
 * el documento de cobro interno `DC-…`, y las referencias de pasarela y de liquidación son
 * claves compartidas entre clínicas — enseñarlas abre los importes de las otras. Es una fuga,
 * no un detalle de interfaz. Cada campo prohibido lleva su marca abajo.
 */
import type { TaxTreatment } from './suscripcion.types'

export type BillingDocumentKind = 'INVOICE' | 'CREDIT_NOTE' | 'DEBIT_NOTE'

export type BillingReason = 'RECURRING_CYCLE' | 'PRORATION' | 'ONE_TIME' | 'ADJUSTMENT'

export type BillingIssueStatus = 'DRAFT' | 'AWAITING_EXTERNAL' | 'EXTERNAL_REGISTERED' | 'VOIDED'

export type SubscriptionChargeType =
  'RECURRING' | 'PRORATION' | 'ONE_TIME' | 'CREDIT' | 'DISCOUNT' | 'OVERAGE'

export type SubscriptionChargeStatus = 'PENDING' | 'INVOICED' | 'VOIDED'

export type PaymentMethodKind = 'TRANSFER' | 'CARD' | 'PSE' | 'CASH' | 'OTHER'

export type SubscriptionPaymentStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED'

export type CustomerCreditEntryKind = 'GRANT' | 'CONSUMPTION' | 'EXPIRATION' | 'VOID' | 'CORRECTION'

export type CustomerCreditOriginKind =
  'OVERPAYMENT' | 'CREDIT_NOTE' | 'CANCELLATION' | 'APPLICATION' | 'EXPIRY' | 'ROUNDING' | 'MANUAL'

export type DunningEventType =
  'REMINDER_SENT' | 'GRACE_STARTED' | 'READ_ONLY_APPLIED' | 'REACTIVATED' | 'WRITTEN_OFF'

export type DunningChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PHONE' | 'IN_APP'

/** Desglose de impuesto de un documento. Se pinta como frase, nunca como columna de `taxRate`. */
export interface BillingDocumentTaxSummary {
  id?: number
  taxTreatment?: TaxTreatment
  taxRate?: number
  taxableBase?: number
  taxAmount?: number
}

export interface BillingDocumentResponse {
  id: number
  companyId: number
  /** **NO se pinta**: es el documento de cobro interno (`DC-…`). El cliente ve su factura. */
  documentNumber?: string
  subscriptionId?: number
  documentKind?: BillingDocumentKind
  billingReason?: BillingReason
  periodStart?: string
  periodEnd?: string
  /** **NO se pinta en crudo**: se colapsa a una frase (`cobrosText.estadoEmision`). */
  issueStatus?: BillingIssueStatus
  externalInvoiceNumber?: string
  externalCufe?: string
  externalIssuedAt?: string
  /** **NO se pinta**: constancia interna del emisor. */
  externalProvider?: string
  /** **NO se pinta**: constancia interna. */
  externalRegisteredAt?: string
  /** **NO se pinta**: identificador de un operador de plataforma. */
  externalRegisteredBySystemUserId?: number
  /** **NO se pinta**: referencia interna entre documentos. */
  correctsDocumentId?: number
  dueDate?: string
  subtotalAmount?: number
  taxAmount?: number
  totalAmount?: number
  settledAmount?: number
  balanceAmount?: number
  /** Suelto para `MatchesContract`: se lee siempre con `Array.isArray`, nunca con `?? []`. */
  taxes?: BillingDocumentTaxSummary[]
  createdDate?: string
  /** **NO se pinta**: control de concurrencia. */
  version?: number
}

/** Un cargo dentro de una cuenta de cobro. Responde a «¿de dónde salen estos 18.500?». */
export interface SubscriptionChargeResponse {
  id: number
  subscriptionId?: number
  subscriptionItemId?: number
  chargeType?: SubscriptionChargeType
  description?: string
  servicePeriodStart?: string
  servicePeriodEnd?: string
  quantity?: number
  unitAmount?: number
  subtotalAmount?: number
  taxRate?: number
  taxTreatment?: TaxTreatment
  /** Con `periodDays`, es lo que hace entendible un importe raro: «ajuste por días». */
  prorationDays?: number
  periodDays?: number
  status?: SubscriptionChargeStatus
  amendmentId?: number
  billingDocumentId?: number
  voidsChargeId?: number
  createdDate?: string
}

/**
 * Un pago ya registrado. **Solo lectura**: quien registra el pago es la plataforma
 * (`POST /subscription-payments` es de sistema), y esta pantalla lo dice.
 */
export interface SubscriptionPaymentResponse {
  id: number
  companyId: number
  amount: number
  currency: string
  paymentMethod: PaymentMethodKind
  /** **NO se pinta**: nombre interno de la pasarela. */
  gateway?: string
  /** **NO se pinta**: referencia de liquidación, compartida entre clínicas. */
  gatewayReference?: string
  receivedAt: string
  status: SubscriptionPaymentStatus
  /** **NO se pinta**: marca de conciliación interna. */
  reconciledAt?: string
  createdDate: string
  /** **NO se pinta**: control de concurrencia. */
  version?: number
}

export interface CustomerCreditBalanceResponse {
  id: number
  companyId: number
  balanceAmount: number
  nextExpiryOn?: string
  recalculatedAt: string
  version?: number
}

export interface CustomerCreditEntryResponse {
  id: number
  companyId: number
  entryKind: CustomerCreditEntryKind
  amount: number
  lotEntryId?: number
  originKind: CustomerCreditOriginKind
  originPaymentId?: number
  originDocumentId?: number
  originSubscriptionId?: number
  occurredAt: string
  valueDate: string
  expiresOn?: string
  createdDate: string
}

export interface DunningSubscriptionSummary {
  id: number
  companyId: number
  subscriptionNumber?: string
  status?: string
}

export interface DunningBillingDocumentSummary {
  id: number
  companyId: number
  /** **NO se pinta**: `DC-…` interno. */
  documentNumber?: string
  balanceAmount?: number
}

/**
 * Un aviso de cobranza que se le envió a la clínica.
 *
 * <p>De aquí se enseñan `eventType` traducido, `occurredAt` y `daysOverdue`. **`detail` y
 * `channel` no**: son notas internas de cobranza, y el nombre del enum no se enseña nunca.
 */
export interface DunningEventResponse {
  id: number
  companyId: number
  subscription: DunningSubscriptionSummary
  billingDocument?: DunningBillingDocumentSummary
  eventType: DunningEventType
  daysOverdue?: number
  /** **NO se pinta**: nota interna de cobranza. */
  channel?: DunningChannel
  /** **NO se pinta**: nota interna de cobranza. */
  detail?: string
  occurredAt: string
  createdDate: string
}

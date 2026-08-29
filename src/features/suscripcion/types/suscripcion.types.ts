/**
 * El plan de la clínica — espejo de los DTO de `subscription` del backend.
 *
 * <p>Lo que el tenant puede hacer sobre su propio plan lo acota el `@PreAuthorize` de cada
 * puerto, no esta pantalla: pedir la baja, quitar una línea y cambiar una cantidad, sí;
 * **añadir una línea o mover el estado, no** (`POST /subscriptions/{id}/items` lleva
 * `unitAmount` en el cuerpo, y `PATCH …/status` es la palanca de cobro). Por eso aquí no hay
 * ningún tipo de petición de alta de línea: no es un olvido.
 */

export type SubscriptionStatus =
  'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'READ_ONLY' | 'CANCELLED' | 'EXPIRED'

export type BillingCycle = 'MONTHLY' | 'ANNUAL'

export type SubscriptionItemType = 'MODULE' | 'CAPACITY' | 'ONE_TIME' | 'BUNDLE'

export type SubscriptionItemOrigin =
  'INITIAL' | 'ADDON' | 'QUANTITY_CHANGE' | 'REMOVAL' | 'MIGRATION'

export type TaxTreatment = 'TAXED' | 'EXEMPT' | 'EXCLUDED'

/**
 * `GET /subscriptions/current`.
 *
 * <p>Trae ya todo lo que hace falta para los estados no felices, que son la mitad del valor de
 * estas pantallas: `status`, `pastDueSince`, `graceDays`, `trialEndDate`, `cancelRequestedAt`,
 * `cancelEffectiveDate`, `commitmentEndDate` y `nextBillingDate`.
 *
 * <p>`priceListId`, `quoteId` y `companyId` se declaran porque el contrato los trae —el
 * guardián exige declarar el esquema entero—, pero **no se pintan**: son referencias internas
 * de plataforma. `subscriptionNumber` sí, que es lo que soporte pide por teléfono.
 */
export interface SubscriptionResponse {
  id: number
  subscriptionNumber: string
  /** **NO se pinta**: referencia interna de plataforma. */
  companyId: number
  /** **NO se pinta**: referencia interna de plataforma. */
  quoteId?: number
  /** **NO se pinta**: referencia interna de plataforma. */
  priceListId?: number
  billingCycle: BillingCycle
  status: SubscriptionStatus
  current: boolean
  startDate: string
  trialEndDate?: string
  currentPeriodStart?: string
  currentPeriodEnd?: string
  nextBillingDate?: string
  commitmentEndDate?: string
  graceDays?: number
  pastDueSince?: string
  autoRenew: boolean
  cancelRequestedAt?: string
  cancelEffectiveDate?: string
  cancelReason?: string
  createdDate: string
  enabled: boolean
}

/** Una línea del plan: qué incluye, cuántas unidades y a cuánto. */
export interface SubscriptionItemResponse {
  id: number
  companyId: number
  subscriptionId: number
  catalogItemId?: number
  itemCode?: string
  itemName?: string
  itemType?: SubscriptionItemType
  capacityUnit?: string
  tierMin?: number
  tierMax?: number
  includedQuantity?: number
  taxTreatment?: TaxTreatment
  quantity?: number
  billableQuantity?: number
  unitAmount?: number
  discountPercent?: number
  discountAmount?: number
  discountIsConditional?: boolean
  taxRate?: number
  taxableBase?: number
  effectiveFrom?: string
  effectiveTo?: string
  origin?: SubscriptionItemOrigin
  createdAmendmentId?: number
  endedAmendmentId?: number
  createdDate?: string
  enabled?: boolean
}

/**
 * `PATCH /subscriptions/{id}/cancel`.
 *
 * <p>`effectiveDate` es el final del periodo ya pagado, no «hoy»: la baja separa las dos fechas
 * y el plan sigue vigente hasta la segunda. El modal lo dice antes del botón.
 */
export interface CancelSubscriptionRequest {
  requestedAt: string
  effectiveDate: string
  reason?: string
  clientRequestId: string
}

/** `PATCH /subscriptions/{id}/items/remove`. Sin precio: la clínica elige si se va, no a cuánto. */
export interface RemoveSubscriptionItemRequest {
  subscriptionItemId: number
  clientRequestId: string
  effectiveDate: string
  reason?: string
}

/** `POST /subscriptions/{id}/items/quantity`. Tampoco lleva precio, por el mismo motivo. */
export interface ChangeSubscriptionItemQuantityRequest {
  subscriptionItemId: number
  newQuantity: number
  clientRequestId: string
  effectiveDate: string
  reason?: string
}

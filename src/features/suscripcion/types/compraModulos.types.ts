/** Espejo de `ModulePurchaseRequest`/`ModulePurchaseResponse` (`POST /subscriptions/modules/purchase`). */

export interface ModulePurchaseRequest {
  catalogItemCodes: string[]
  billingCycle: 'MONTHLY' | 'ANNUAL'
  /** El medio de pago ya activo con el que se cobra: el de la empresa, o el recién tokenizado. */
  paymentSourceId: number
  clientRequestId: string
}

export interface PurchasedModuleLineResponse {
  catalogItemCode?: string
  firstChargeDate?: string
  chargedNow?: boolean
}

export interface ModulePurchaseResponse {
  quoteId?: number
  lines?: PurchasedModuleLineResponse[]
}

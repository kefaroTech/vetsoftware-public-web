/**
 * Espejo manual del contrato de `paymentgateway` (backend, rodaja `com.vetsoftware.app.paymentgateway`).
 *
 * <p>`src/api/*` lo regenera `api-contract-sync` en cuanto el contrato esté publicado — estos
 * tipos no se tocan desde ahí, se sustituyen por la importación generada cuando corresponda.
 */

/** `GET /payment-gateway/wompi/checkout-config`. */
export interface WompiCheckoutConfigResponse {
  environment: 'SANDBOX' | 'PRODUCTION'
  apiBaseUrl: string
  publicKey: string
  acceptance: { token: string; permalink: string }
  personalDataAuthorization: { token: string; permalink: string }
}

/** `POST /payment-gateway/wompi/payment-sources`. */
export interface WompiPaymentSourceRequest {
  cardToken: string
  acceptanceToken: string
  personalDataAuthToken: string
  brand: string
  lastFour: string
  expMonth: number
  expYear: number
}

/** Respuesta de `POST /payment-gateway/wompi/payment-sources`. */
export interface WompiPaymentMethodResponse {
  paymentMethodId: number
  brand: string
  lastFour: string
  expiresOn: string
  defaultMethod: boolean
}

/** `GET /payment-gateway/wompi/first-period-payment`. */
export interface FirstPeriodPaymentResponse {
  status: 'APPROVED' | 'PENDING' | 'DECLINED' | 'NOT_ATTEMPTED'
  amount: number | null
  currency: string | null
  gatewayReference: string | null
  attemptedAt: string | null
}

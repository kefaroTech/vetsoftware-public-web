/**
 * Medios de pago de la suscripción.
 *
 * <p>Es el único bloque con escritura real de dinero para el tenant, y por un motivo escrito en
 * el backend: **revocar es un derecho que no puede quedar detrás de una gestión de plataforma**
 * (`SubscriptionPaymentMethodController`). Lo que sí queda detrás es dar de alta un medio nuevo
 * — ver `RegisterSubscriptionPaymentMethodRequest`.
 */

export type PaymentMethodKind = 'CARD' | 'PSE'

export type MandateStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED'

export interface SubscriptionPaymentMethodResponse {
  id: number
  companyId: number
  methodKind: PaymentMethodKind
  /** **NO se pinta**: constancia interna del emisor. */
  gateway: string
  brand?: string
  lastFour?: string
  expiresOn?: string
  mandateStatus: MandateStatus
  /** **NO se pinta**: puede llevar una referencia de pasarela. */
  mandateEvidence: string
  authorizedAt: string
  revokedAt?: string
  revokedReason?: string
  defaultMethod: boolean
  createdDate: string
  /** **NO se pinta**: control de concurrencia. */
  version?: number
}

/**
 * `POST /subscription-payment-methods` — **escrito, no cableado a esta pantalla**.
 *
 * <p>El widget de tokenización con Wompi ya existe (`MedioDePagoWompi.vue`, feature
 * `contratacion`), pero da de alta el medio de pago por `POST /payment-gateway/wompi/payment-sources`
 * — el registro inicial ocurre siempre al contratar, dentro del paso 6. `MediosPagoView` no repite
 * ese alta para un medio ADICIONAL o de reemplazo, y por eso ofrece el canal de soporte en su
 * lugar. El tipo y la acción del store se dejan escritos para el día en que esta pantalla necesite
 * su propio formulario, sin pasar por la autocontratación.
 */
export interface RegisterSubscriptionPaymentMethodRequest {
  methodKind: PaymentMethodKind
  gateway: string
  /** El de la pasarela. */
  token: string
  brand?: string
  lastFour?: string
  expiresOn?: string
  mandateEvidence: string
  authorizedAt: string
}

/** `PATCH /subscription-payment-methods/{id}/revocation`. `reason` es obligatorio, máx. 255. */
export interface RevokeSubscriptionPaymentMethodRequest {
  reason: string
}

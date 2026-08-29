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
 * `POST /subscription-payment-methods` — **escrito, no cableado a ningún formulario todavía**.
 *
 * <p>El campo que lo impide es `token`: el de la pasarela, obligatorio, que solo produce un
 * widget de tokenización. Este front no tiene ninguno — sus dependencias son
 * `@grafana/faro-*`, `axios`, `lucide-vue-next`, `pinia`, `vue`, `vue-datepicker-next`,
 * `vue-router` y `vuetify`, y ni una de pasarela.
 *
 * <p>Pedirle a una auxiliar «el token de la pasarela» promete una acción que no puede
 * completar; pedirle el número de tarjeta sería peor, porque sin tokenización ese dato viajaría
 * en claro por nuestro dominio. La pantalla ofrece el canal de soporte en su lugar
 * (`MediosPagoView`). El tipo y la acción del store se dejan escritos para que, cuando exista el
 * widget, el hueco se sustituya por el formulario **sin tocar nada más**.
 */
export interface RegisterSubscriptionPaymentMethodRequest {
  methodKind: PaymentMethodKind
  gateway: string
  /** El de la pasarela. Sin widget de tokenización no hay forma honesta de obtenerlo. */
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

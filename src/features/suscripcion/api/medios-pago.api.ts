import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  RegisterSubscriptionPaymentMethodRequest,
  RevokeSubscriptionPaymentMethodRequest,
  SubscriptionPaymentMethodResponse,
} from '../types/medios-pago.types'

/** Sin `companyId`: ver `suscripcion.api.ts`. */
export const mediosPagoApi = {
  async listAll(page = 0, pageSize = 50): Promise<PageResponse<SubscriptionPaymentMethodResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionPaymentMethodResponse>>(
      '/subscription-payment-methods',
      { params: { page, pageSize } },
    )
    return data
  },

  async findById(id: number): Promise<SubscriptionPaymentMethodResponse> {
    const { data } = await http.get<SubscriptionPaymentMethodResponse>(
      `/subscription-payment-methods/${id}`,
    )
    return data
  },

  /** `PATCH /{id}/default` — sin cuerpo. */
  async setDefault(id: number): Promise<SubscriptionPaymentMethodResponse> {
    const { data } = await http.patch<SubscriptionPaymentMethodResponse>(
      `/subscription-payment-methods/${id}/default`,
    )
    return data
  },

  /** `PATCH /{id}/revocation` — el motivo es obligatorio para el backend. */
  async revoke(
    id: number,
    payload: RevokeSubscriptionPaymentMethodRequest,
  ): Promise<SubscriptionPaymentMethodResponse> {
    const { data } = await http.patch<SubscriptionPaymentMethodResponse>(
      `/subscription-payment-methods/${id}/revocation`,
      payload,
    )
    return data
  },

  /**
   * `POST /subscription-payment-methods` — **escrito y sin pantalla que lo llame**.
   *
   * <p>No es código muerto por descuido: el widget de tokenización con Wompi
   * (`MedioDePagoWompi.vue`, feature `contratacion`) da de alta el medio de pago por
   * `POST /payment-gateway/wompi/payment-sources`, no por este endpoint genérico — el registro
   * inicial de la empresa ocurre siempre al contratar. Este método se deja escrito para el día en
   * que `MediosPagoView` necesite dar de alta un medio SIN pasar por esa contratación (una tarjeta
   * de refuerzo, un cambio de banco). Ver `RegisterSubscriptionPaymentMethodRequest`.
   */
  async create(
    payload: RegisterSubscriptionPaymentMethodRequest,
  ): Promise<SubscriptionPaymentMethodResponse> {
    const { data } = await http.post<SubscriptionPaymentMethodResponse>(
      '/subscription-payment-methods',
      payload,
    )
    return data
  },
}

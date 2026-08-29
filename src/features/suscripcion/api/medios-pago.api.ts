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
   * <p>No es código muerto por descuido: el endpoint exige `token` de pasarela y este front no
   * tiene widget de tokenización. Dejarlo escrito es lo que permite que, cuando lo haya, el
   * hueco honesto de `MediosPagoView` se sustituya por el formulario sin tocar la capa de API.
   * Ver `RegisterSubscriptionPaymentMethodRequest`.
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

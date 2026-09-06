import axios from 'axios'
import { http } from '@/services/http/http.client'
import type {
  FirstPeriodPaymentResponse,
  WompiCheckoutConfigResponse,
  WompiPaymentMethodResponse,
  WompiPaymentSourceRequest,
} from '../types/pago.types'

/** Nuestro backend. Lleva el JWT del tenant, como cualquier otro cliente del repo. */
export const wompiApi = {
  async checkoutConfig(): Promise<WompiCheckoutConfigResponse> {
    const { data } = await http.get<WompiCheckoutConfigResponse>(
      '/payment-gateway/wompi/checkout-config',
    )
    return data
  },

  async crearFuenteDePago(payload: WompiPaymentSourceRequest): Promise<WompiPaymentMethodResponse> {
    const { data } = await http.post<WompiPaymentMethodResponse>(
      '/payment-gateway/wompi/payment-sources',
      payload,
    )
    return data
  },

  async primerPago(): Promise<FirstPeriodPaymentResponse> {
    const { data } = await http.get<FirstPeriodPaymentResponse>(
      '/payment-gateway/wompi/first-period-payment',
    )
    return data
  },
}

export interface DatosTarjeta {
  number: string
  cvc: string
  /** `'MM'`, tal como exige Wompi. */
  expMonth: string
  /** `'YY'`, tal como exige Wompi. */
  expYear: string
  cardHolder: string
}

/** `data` de `POST {apiBaseUrl}/tokens/cards` (docs.wompi.co), sin envolver. */
export interface WompiCardToken {
  id: string
  brand: string
  last_four: string
  exp_month: string
  exp_year: string
}

/**
 * Tokeniza la tarjeta DIRECTO contra Wompi, con una instancia de axios propia y no el `http` del
 * repo: `http` adjunta nuestro JWT y pasa por los interceptores de refresh/loader, y ninguno de
 * los dos pinta aquí — el destino no es nuestro backend y la llave pública de Wompi (diseñada
 * para vivir en el navegador, docs.wompi.co) es la única credencial que esta llamada lleva.
 *
 * <p>El número de tarjeta y el CVC solo existen en el argumento `tarjeta`: no se guardan en
 * ningún store ni se registran en ningún log.
 */
export async function tokenizarTarjeta(
  apiBaseUrl: string,
  publicKey: string,
  tarjeta: DatosTarjeta,
): Promise<WompiCardToken> {
  const wompi = axios.create({ baseURL: apiBaseUrl })
  const { data } = await wompi.post<{ data: WompiCardToken }>(
    '/tokens/cards',
    {
      number: tarjeta.number,
      cvc: tarjeta.cvc,
      exp_month: tarjeta.expMonth,
      exp_year: tarjeta.expYear,
      card_holder: tarjeta.cardHolder,
    },
    { headers: { Authorization: `Bearer ${publicKey}` } },
  )
  return data.data
}

import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  BillingDocumentResponse,
  CustomerCreditBalanceResponse,
  CustomerCreditEntryResponse,
  DunningEventResponse,
  SubscriptionChargeResponse,
  SubscriptionPaymentResponse,
} from '../types/cobros.types'

/**
 * Cuentas de cobro, cargos, pagos, saldo a favor y avisos de cobranza. **Todo lectura.**
 *
 * <p>Quien factura y quien registra el pago es la plataforma: `POST /subscription-payments` es
 * de sistema y no tiene equivalente aquí. Es la llamada que más fácil se cuela, porque la
 * consola tiene un `RegisterPaymentModal` y es tentador clonarlo. Sin `companyId`: ver
 * `suscripcion.api.ts`.
 */

/** Tope de filas por página del servidor; pedir más se recorta allí. */
const MAX_PAGE_SIZE = 200

/**
 * Cuántas páginas se drenan buscando los cargos de un documento. Ver `listChargesByDocument`:
 * el endpoint del tenant **no** filtra por `billingDocumentId`, así que hay que filtrar en el
 * cliente y la cota evita que una clínica con años de historial dispare cuarenta peticiones.
 */
const MAX_CHARGE_PAGES = 10

export interface ChargesByDocument {
  charges: SubscriptionChargeResponse[]
  /**
   * `true` si se alcanzó la cota sin llegar al final del historial: el desglose que se pinta
   * puede estar incompleto y la pantalla lo dice en vez de dar por bueno lo que tiene.
   */
  truncated: boolean
}

export const cobrosApi = {
  async listAll(page = 0, pageSize = 20): Promise<PageResponse<BillingDocumentResponse>> {
    const { data } = await http.get<PageResponse<BillingDocumentResponse>>(
      '/subscription-billing/documents',
      { params: { page, pageSize } },
    )
    return data
  },

  async findById(id: number): Promise<BillingDocumentResponse> {
    const { data } = await http.get<BillingDocumentResponse>(
      `/subscription-billing/documents/${id}`,
    )
    return data
  },

  /**
   * Cargos de UNA cuenta de cobro.
   *
   * <p><b>El endpoint del tenant no acepta `billingDocumentId`.</b> `GET
   * /subscription-billing/charges` solo declara `page`, `pageSize`, `status` y `subscriptionId`
   * (verificado contra `api/openapi.json`), así que el filtro se hace aquí sobre
   * `charge.billingDocumentId`. No es lo deseable —se traen cargos que no se van a pintar—,
   * pero la alternativa era pedirle al backend un parámetro que hoy no existe. Cuando lo tenga,
   * este método se reduce a una llamada y `truncated` desaparece.
   */
  async listChargesByDocument(
    billingDocumentId: number,
    subscriptionId?: number,
  ): Promise<ChargesByDocument> {
    const charges: SubscriptionChargeResponse[] = []
    let page = 0
    let totalPages = 1
    while (page < totalPages && page < MAX_CHARGE_PAGES) {
      const { data } = await http.get<PageResponse<SubscriptionChargeResponse>>(
        '/subscription-billing/charges',
        { params: { page, pageSize: MAX_PAGE_SIZE, subscriptionId } },
      )
      // `totalPages` se relee de CADA respuesta y no se calcula a partir del tamaño pedido: el
      // servidor puede recortar `pageSize` y entonces el cálculo se queda corto.
      totalPages = Math.max(1, data.totalPages)
      charges.push(...data.content.filter((c) => c.billingDocumentId === billingDocumentId))
      page += 1
    }
    return { charges, truncated: page >= MAX_CHARGE_PAGES && page < totalPages }
  },

  async listPayments(page = 0, pageSize = 20): Promise<PageResponse<SubscriptionPaymentResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionPaymentResponse>>(
      '/subscription-payments',
      { params: { page, pageSize } },
    )
    return data
  },

  async findCreditBalance(): Promise<CustomerCreditBalanceResponse> {
    const { data } = await http.get<CustomerCreditBalanceResponse>('/customer-credit/balance')
    return data
  },

  async listCreditEntries(
    page = 0,
    pageSize = 20,
  ): Promise<PageResponse<CustomerCreditEntryResponse>> {
    const { data } = await http.get<PageResponse<CustomerCreditEntryResponse>>(
      '/customer-credit/entries',
      { params: { page, pageSize } },
    )
    return data
  },

  async listBySubscription(
    subscriptionId: number,
    page = 0,
    pageSize = 20,
  ): Promise<PageResponse<DunningEventResponse>> {
    const { data } = await http.get<PageResponse<DunningEventResponse>>('/dunning-events', {
      params: { subscriptionId, page, pageSize },
    })
    return data
  },
}

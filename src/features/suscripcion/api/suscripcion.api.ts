import { http } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import type {
  CancelSubscriptionRequest,
  ChangeSubscriptionItemQuantityRequest,
  RemoveSubscriptionItemRequest,
  SubscriptionItemResponse,
  SubscriptionResponse,
} from '../types/suscripcion.types'
import type { CompanyAccessResponse } from '../types/cupos.types'

/**
 * El plan de la clínica.
 *
 * <p><b>Ninguna llamada de esta feature pasa `companyId`.</b> El backend resuelve la empresa de
 * un empleado desde el `EmployeeContext` del token (`Authz.currentCompanyId()`) e **ignora** la
 * cabecera `X-Company-Id`. El campo `companyId` de la config de axios existe en este front solo
 * porque `http.client.ts` es gemelo byte a byte con el de la consola, y su rama está inerte
 * aquí. El síntoma de mandarla es que no hay síntoma: funciona igual y nadie se entera, hasta
 * que alguien copia el patrón a un endpoint donde sí manda.
 */
export const suscripcionApi = {
  /** `GET /subscriptions/current` → 404 cuando la clínica no tiene plan vigente. */
  async findCurrent(): Promise<SubscriptionResponse> {
    const { data } = await http.get<SubscriptionResponse>('/subscriptions/current')
    return data
  },

  async listItems(
    subscriptionId: number,
    page = 0,
    pageSize = 100,
  ): Promise<PageResponse<SubscriptionItemResponse>> {
    const { data } = await http.get<PageResponse<SubscriptionItemResponse>>(
      `/subscriptions/${subscriptionId}/items`,
      { params: { page, pageSize } },
    )
    return data
  },

  /**
   * `GET /entitlements/access` — módulos activos y capacidades.
   *
   * <p>Es el único endpoint de la feature sin permiso propio: su puerto solo comprueba
   * `isMyCompany`. Ninguna empresa puede tenerlo cerrado por un rol mal sembrado.
   */
  async findAccess(): Promise<CompanyAccessResponse> {
    const { data } = await http.get<CompanyAccessResponse>('/entitlements/access')
    return data
  },

  /** `PATCH /subscriptions/{id}/cancel` — pide la baja; no la ejecuta hoy. */
  async cancel(
    subscriptionId: number,
    payload: CancelSubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    const { data } = await http.patch<SubscriptionResponse>(
      `/subscriptions/${subscriptionId}/cancel`,
      payload,
    )
    return data
  },

  async removeItem(
    subscriptionId: number,
    payload: RemoveSubscriptionItemRequest,
  ): Promise<SubscriptionItemResponse> {
    const { data } = await http.patch<SubscriptionItemResponse>(
      `/subscriptions/${subscriptionId}/items/remove`,
      payload,
    )
    return data
  },

  async changeItemQuantity(
    subscriptionId: number,
    payload: ChangeSubscriptionItemQuantityRequest,
  ): Promise<SubscriptionItemResponse> {
    const { data } = await http.post<SubscriptionItemResponse>(
      `/subscriptions/${subscriptionId}/items/quantity`,
      payload,
    )
    return data
  },
}

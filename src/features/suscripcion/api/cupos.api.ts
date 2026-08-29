import { http } from '@/services/http/http.client'
import type {
  CompanyLimitEventResponse,
  EffectiveLimitResponse,
  SubscriptionItemLimitResponse,
} from '../types/cupos.types'

/**
 * Topes, historial y resolución de un tope concreto. Sin `companyId`: ver `suscripcion.api.ts`.
 *
 * <p>Lo que **no** hay aquí, y no es un olvido: ajustar consumo, conceder una excepción o
 * registrar un evento de límite. `AdjustCompanyUsage`, `GrantCompanyLimitOverride` y
 * `RecordLimitEvent` son de sistema. La única salida de esta pantalla es **pedir**.
 */
export const cuposApi = {
  /** `GET /subscription-item-limits` — array, no página. Permiso `subscriptionItemLimit.read`. */
  async listAll(): Promise<SubscriptionItemLimitResponse[]> {
    const { data } = await http.get<SubscriptionItemLimitResponse[]>('/subscription-item-limits')
    return data
  },

  /**
   * `GET /company-limit-events` — historial. Bloque secundario: un 403 aquí esconde el
   * `<details>` y **nada más**; el resto de la pantalla sigue funcionando.
   */
  async listEvents(from?: string, to?: string): Promise<CompanyLimitEventResponse[]> {
    const { data } = await http.get<CompanyLimitEventResponse[]>('/company-limit-events', {
      params: { from, to },
    })
    return data
  },

  /**
   * `GET /company-limit-overrides/effective-limits/{id}` — «¿de dónde sale este tope?».
   *
   * <p>**Bajo demanda.** No se pide en bucle por cada dimensión al montar: son N peticiones para
   * un dato que casi nadie abre.
   */
  async findEffectiveLimit(limitDimensionId: number): Promise<EffectiveLimitResponse> {
    const { data } = await http.get<EffectiveLimitResponse>(
      `/company-limit-overrides/effective-limits/${limitDimensionId}`,
    )
    return data
  },
}

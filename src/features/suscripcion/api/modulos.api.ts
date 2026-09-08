import { http } from '@/services/http/http.client'
import type { ModulePurchaseRequest, ModulePurchaseResponse } from '../types/compraModulos.types'

/**
 * Solo el `POST` de compra. El `GET /subscriptions/modules` del escaparate lo expone
 * `modulosApi` de `src/features/entitlements/api/`, vía `useModulosStore`: un segundo cliente
 * del mismo `GET` aquí desincronizaría lo que ve «Tus módulos» de lo que ve el gating clínico.
 */
export const compraModulosApi = {
  async purchase(payload: ModulePurchaseRequest): Promise<ModulePurchaseResponse> {
    const { data } = await http.post<ModulePurchaseResponse>(
      '/subscriptions/modules/purchase',
      payload,
    )
    return data
  },
}

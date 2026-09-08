import { http } from '@/services/http/http.client'
import type { ModuleShowcaseResponse } from '../types/modulos.types'

/**
 * El escaparate de módulos de la cuenta. Sin `companyId`: el backend resuelve la empresa desde
 * el token, igual que el resto de esta familia de endpoints (`suscripcion.api.ts`).
 */
export const modulosApi = {
  /** `GET /subscriptions/modules` — array, no página: son como mucho una veintena. */
  async listAll(): Promise<ModuleShowcaseResponse[]> {
    const { data } = await http.get<ModuleShowcaseResponse[]>('/subscriptions/modules')
    return data
  },
}

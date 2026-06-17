import { http } from '@/services/http/http.client'
import type {
  DianProviderConfigResponse,
  SaveDianProviderConfigRequest,
} from '../types/facturacion'

export const dianProviderConfigApi = {
  /** Devuelve null si la empresa aún no tiene proveedor configurado (404). */
  async find(): Promise<DianProviderConfigResponse | null> {
    try {
      const { data } = await http.get<DianProviderConfigResponse>('/dian-provider-configs')
      return data
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  },

  async create(payload: SaveDianProviderConfigRequest): Promise<DianProviderConfigResponse> {
    const { data } = await http.post<DianProviderConfigResponse>('/dian-provider-configs', payload)
    return data
  },

  async update(payload: SaveDianProviderConfigRequest): Promise<DianProviderConfigResponse> {
    const { data } = await http.put<DianProviderConfigResponse>('/dian-provider-configs', payload)
    return data
  },
}

function isNotFound(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'response' in e &&
    (e as { response?: { status?: number } }).response?.status === 404
}

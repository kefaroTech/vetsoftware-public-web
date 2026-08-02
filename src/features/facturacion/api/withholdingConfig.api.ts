import { http } from '@/services/http/http.client'
import type { SaveWithholdingConfigRequest, WithholdingConfigResponse } from '../types/facturacion'

export const withholdingConfigApi = {
  /** Devuelve null si la empresa aún no tiene tarifas configuradas (404). */
  async find(): Promise<WithholdingConfigResponse | null> {
    try {
      const { data } = await http.get<WithholdingConfigResponse>('/withholding-configs')
      return data
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  },

  /** Upsert (PUT) de las tarifas de retención. */
  async save(payload: SaveWithholdingConfigRequest): Promise<WithholdingConfigResponse> {
    const { data } = await http.put<WithholdingConfigResponse>('/withholding-configs', payload)
    return data
  },
}

function isNotFound(e: unknown): boolean {
  return (
    !!e &&
    typeof e === 'object' &&
    'response' in e &&
    (e as { response?: { status?: number } }).response?.status === 404
  )
}

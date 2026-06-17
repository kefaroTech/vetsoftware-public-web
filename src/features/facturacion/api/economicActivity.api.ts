import { http } from '@/services/http/http.client'
import type { EconomicActivity } from '../types/facturacion'

export const economicActivityApi = {
  async listAll(): Promise<EconomicActivity[]> {
    const { data } = await http.get<EconomicActivity[]>('/economic-activities')
    return data
  },
}

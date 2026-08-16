import type { SpaTypeResponse, CreateSpaTypePayload } from '../types/spa-types.types'
import { http } from '@/services/http/http.client'

export const spaTypeApi = {
  async listAll(): Promise<SpaTypeResponse[]> {
    const { data } = await http.get<SpaTypeResponse[]>('/spa-types')
    return data
  },

  async create(payload: CreateSpaTypePayload): Promise<SpaTypeResponse> {
    const { data } = await http.post<SpaTypeResponse>('/spa-types', payload)
    return data
  },
}

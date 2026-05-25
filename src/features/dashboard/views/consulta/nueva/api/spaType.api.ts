import { http } from '@/services/http/http.client'

export interface SpaTypeResponse {
  id: number
  name: string
  description: string | null
  createdDate: string
}

export interface CreateSpaTypePayload {
  name: string
  description: string
}

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

import type { SpecieResponse } from '../types/species.types'
import { http } from '@/services/http/http.client'

export const speciesApi = {
  async listAll(): Promise<SpecieResponse[]> {
    const { data } = await http.get<SpecieResponse[]>('/species')
    return data
  },

  async findById(id: number): Promise<SpecieResponse> {
    const { data } = await http.get<SpecieResponse>(`/species/${id}`)
    return data
  },
}

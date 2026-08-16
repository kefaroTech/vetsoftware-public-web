import { http } from '@/services/http/http.client'

export interface SpecieResponse {
  id: number
  name: string
  createdDate: string
}

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

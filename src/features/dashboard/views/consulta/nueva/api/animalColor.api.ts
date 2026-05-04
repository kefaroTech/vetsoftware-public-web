import { http } from '@/services/http/http.client'

export interface AnimalColorResponse {
  id: number
  name: string
  createdDate: string
}

export const animalColorApi = {
  async listAll(): Promise<AnimalColorResponse[]> {
    const { data } = await http.get<AnimalColorResponse[]>('/animal-colors')
    return data
  },

  async findById(id: number): Promise<AnimalColorResponse> {
    const { data } = await http.get<AnimalColorResponse>(`/animal-colors/${id}`)
    return data
  },
}

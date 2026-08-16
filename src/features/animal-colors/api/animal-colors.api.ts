import type { AnimalColorResponse } from '../types/animal-colors.types'
import { http } from '@/services/http/http.client'

export const animalColorApi = {
  async listBySpecie(specieId: number): Promise<AnimalColorResponse[]> {
    const { data } = await http.get<AnimalColorResponse[]>(`/species/${specieId}/animal-colors`)
    return data
  },

  async findById(id: number): Promise<AnimalColorResponse> {
    const { data } = await http.get<AnimalColorResponse>(`/animal-colors/${id}`)
    return data
  },
}

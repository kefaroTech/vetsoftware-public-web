import type { BreedResponse } from '../types/breeds.types'
import { http } from '@/services/http/http.client'

export const breedApi = {
  async listBySpecie(specieId: number): Promise<BreedResponse[]> {
    const { data } = await http.get<BreedResponse[]>(`/species/${specieId}/breeds`)
    return data
  },

  async findById(id: number): Promise<BreedResponse> {
    const { data } = await http.get<BreedResponse>(`/breeds/${id}`)
    return data
  },
}

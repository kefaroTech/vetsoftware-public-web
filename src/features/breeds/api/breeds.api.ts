import { http } from '@/services/http/http.client'

export interface BreedSpecieSummary {
  id: number
  name: string
}

export interface BreedResponse {
  id: number
  name: string
  specie: BreedSpecieSummary
  createdDate: string
}

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

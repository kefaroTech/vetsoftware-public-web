import { http } from '@/services/http/http.client'

export interface AnimalColorSpecieSummary {
  id: number
  name: string
}

export interface AnimalColorResponse {
  id: number
  name: string
  specie: AnimalColorSpecieSummary
  createdDate: string
}

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

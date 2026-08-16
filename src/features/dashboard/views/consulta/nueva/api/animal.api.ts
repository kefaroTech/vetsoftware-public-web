import type { AnimalResponse, CreateAnimalRequest } from '../types/animal.types'
import { http } from '@/services/http/http.client'

export const animalApi = {
  async create(payload: CreateAnimalRequest): Promise<AnimalResponse> {
    const { data } = await http.post<AnimalResponse>('/animals', payload)
    return data
  },

  async findById(id: number): Promise<AnimalResponse> {
    const { data } = await http.get<AnimalResponse>(`/animals/${id}`)
    return data
  },

  async listByOwner(ownerId: number): Promise<AnimalResponse[]> {
    const { data } = await http.get<AnimalResponse[]>(`/animals/by-owner/${ownerId}`)
    return data
  },
}

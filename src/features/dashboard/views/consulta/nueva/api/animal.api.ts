import type {
  AnimalResponse,
  CreateAnimalRequest,
  UpdateAnimalRequest,
} from '../types/animal.types'
import { http } from '@/services/http/http.client'

export const animalApi = {
  async create(payload: CreateAnimalRequest): Promise<AnimalResponse> {
    const { data } = await http.post<AnimalResponse>('/animals', payload)
    return data
  },

  async update(id: number, payload: UpdateAnimalRequest): Promise<AnimalResponse> {
    const { data } = await http.put<AnimalResponse>(`/animals/${id}`, payload)
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

  async remove(id: number): Promise<void> {
    await http.delete(`/animals/${id}`)
  },
}

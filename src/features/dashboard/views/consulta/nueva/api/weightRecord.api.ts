import type { WeightRecordResponse, CreateWeightRecordRequest } from '../types/weightRecord.types'
import { http } from '@/services/http/http.client'

// Serie temporal del peso del animal (recurso anidado: /animals/{animalId}/weight-records).
export const weightRecordApi = {
  async listByAnimal(animalId: number): Promise<WeightRecordResponse[]> {
    const { data } = await http.get<WeightRecordResponse[]>(`/animals/${animalId}/weight-records`)
    return data
  },

  async latest(animalId: number): Promise<WeightRecordResponse> {
    const { data } = await http.get<WeightRecordResponse>(
      `/animals/${animalId}/weight-records/latest`,
    )
    return data
  },

  async create(
    animalId: number,
    payload: CreateWeightRecordRequest,
  ): Promise<WeightRecordResponse> {
    const { data } = await http.post<WeightRecordResponse>(
      `/animals/${animalId}/weight-records`,
      payload,
    )
    return data
  },

  async remove(animalId: number, id: number): Promise<void> {
    await http.delete(`/animals/${animalId}/weight-records/${id}`)
  },
}

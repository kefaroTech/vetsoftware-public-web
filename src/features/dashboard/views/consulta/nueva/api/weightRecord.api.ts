import { http } from '@/services/http/http.client'
import type { WeightUnit } from '@/types/domain'

export type WeightSource = 'MANUAL' | 'CONSULTATION' | 'HOSPITALIZATION'

export interface WeightRecordResponse {
  id: number
  animalId: number
  animalName: string
  animalCode: string
  value: number
  unit: WeightUnit
  measuredAt: string
  source: WeightSource
  sourceId: number | null
  note: string | null
  createdDate: string
}

export interface CreateWeightRecordRequest {
  value: number
  // Opcional: si es null, el backend usa la unidad preferida del animal.
  unit?: WeightUnit | null
  // Opcional: fecha de la medición (YYYY-MM-DD); por defecto hoy. No puede ser futura.
  measuredAt?: string | null
  note?: string | null
}

// Serie temporal del peso del animal (recurso anidado: /animals/{animalId}/weight-records).
export const weightRecordApi = {
  async listByAnimal(animalId: number): Promise<WeightRecordResponse[]> {
    const { data } = await http.get<WeightRecordResponse[]>(
      `/animals/${animalId}/weight-records`,
    )
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

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

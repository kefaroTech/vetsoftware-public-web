import type { DewormingType } from '@/types/domain'

export interface CreateDewormingPayload {
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animalId: number
  consultationId: number | null
}

export interface DewormingAnimalSummary {
  id: number
  name: string
  code: string
}

export interface DewormingConsultationSummary {
  id: number
  date: string
}

export interface DewormingCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface DewormingResponse {
  id: number
  date: string
  lastDeworming: string | null
  type: DewormingType
  product: string
  dosage: string
  nextControl: string | null
  observations: string
  animal: DewormingAnimalSummary
  consultation: DewormingConsultationSummary | null
  company: DewormingCompanySummary
  createdDate: string
}

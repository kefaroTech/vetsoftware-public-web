import type { HospitalizationType, ReasonLeaving } from '@/types/domain'

export interface CreateHospitalizationPayload {
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
  // Peso opcional al ingreso → historial de peso del animal.
  weight?: number | null
  weightUnit?: string | null
}

export interface HospitalizationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface HospitalizationConsultationSummary {
  id: number
  date: string
}

export interface HospitalizationCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface HospitalizationResponse {
  id: number
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  animal: HospitalizationAnimalSummary
  consultation: HospitalizationConsultationSummary | null
  company: HospitalizationCompanySummary
  createdDate: string
  enabled: boolean
}

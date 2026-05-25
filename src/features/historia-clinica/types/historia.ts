// Mirror exacto del backend (ClinicalEventResponse + ClinicalEventType)

export type ClinicalEventType =
  | 'CONSULTATION'
  | 'SURGERY'
  | 'VACCINATION'
  | 'DEWORMING'
  | 'HOSPITALIZATION'
  | 'LABORATORY_TEST'
  | 'DIAGNOSTIC_IMAGING'
  | 'PRESCRIPTION'
  | 'SPA'

export interface ClinicalEventResponse {
  sourceId: number
  animalId: number
  eventType: ClinicalEventType
  eventDate: string // ISO yyyy-MM-dd
  endDate: string | null // solo HOSPITALIZATION (multi-día)
  consultationId: number | null
  summary: string | null
}

export interface ClinicalEvent {
  sourceId: number
  animalId: number
  eventType: ClinicalEventType
  eventDate: string
  endDate: string | null
  consultationId: number | null
  summary: string
}

export interface ClinicalHistoryFilters {
  types?: ClinicalEventType[]
  from?: string
  to?: string
}

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
  eventType: ClinicalEventType
  eventDate: string // ISO yyyy-MM-dd
  summary: string | null
}

export interface ClinicalEvent {
  sourceId: number
  eventType: ClinicalEventType
  eventDate: string
  summary: string
}

export interface ClinicalHistoryFilters {
  types?: ClinicalEventType[]
  from?: string
  to?: string
}

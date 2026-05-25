import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'

export interface AgendaEvent {
  id: string // p.ej. "CONSULTATION-9001", "HOSPITALIZATION-401"
  type: ClinicalEventType
  date: string // ISO yyyy-MM-dd (event_date)
  endDate: string | null // solo HOSPITALIZATION (multi-día)
  title: string
  subtitle: string
  animalId: number
  consultationId: number | null
}

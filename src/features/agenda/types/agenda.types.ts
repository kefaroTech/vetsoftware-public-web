import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'

export interface AgendaListParams {
  from?: string // ISO yyyy-MM-dd
  to?: string // ISO yyyy-MM-dd
  types?: ClinicalEventType[]
}

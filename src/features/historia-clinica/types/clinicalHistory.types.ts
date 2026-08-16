import type { ClinicalEventType } from '../types/historia'

export interface ClinicalHistoryParams {
  types?: ClinicalEventType[]
  from?: string
  to?: string
  /** Texto libre sobre el resumen del evento; lo resuelve el servidor (BE-06). */
  q?: string
  /** Solo los procedimientos derivados de esta consulta. */
  consultationId?: number
}

/** Cuántos eventos de cada tipo tiene el animal en toda su historia. */
export interface ClinicalEventTypeCount {
  eventType: ClinicalEventType
  count: number
}

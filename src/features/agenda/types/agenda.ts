import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'
import type { AppointmentResponse } from './appointment'

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

// ── Modelo unificado de la agenda: coexisten CITAS (interactivas) y
//    EVENTOS CLÍNICOS (read-only). Las vistas mes/semana/día renderizan ambos.
export interface AgendaAppointmentItem {
  kind: 'appointment'
  id: string
  date: string // yyyy-MM-dd (día de inicio)
  endDate: null
  time: string // HH:mm
  appt: AppointmentResponse
}
export interface AgendaClinicalItem {
  kind: 'clinical'
  id: string
  date: string
  endDate: string | null
  time: null
  event: AgendaEvent
}
export type AgendaItem = AgendaAppointmentItem | AgendaClinicalItem

/** Devuelve los items que caen en un día (ISO yyyy-MM-dd), ordenados por hora. */
export function itemsOnDay(items: AgendaItem[], iso: string): AgendaItem[] {
  return items
    .filter((it) => {
      if (it.kind === 'clinical' && it.endDate && it.endDate !== it.date) {
        return iso >= it.date && iso <= it.endDate
      }
      return it.date === iso
    })
    .sort((a, b) => {
      // Citas ordenadas por hora; eventos clínicos (sin hora) al final.
      const ta = a.kind === 'appointment' ? a.time : '99:99'
      const tb = b.kind === 'appointment' ? b.time : '99:99'
      return ta.localeCompare(tb)
    })
}

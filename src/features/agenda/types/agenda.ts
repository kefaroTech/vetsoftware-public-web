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

/**
 * Comparador de items dentro de un mismo día.
 * Citas ordenadas por hora; eventos clínicos (sin hora) al final.
 */
export function compareAgendaItems(a: AgendaItem, b: AgendaItem): number {
  const ta = a.kind === 'appointment' ? a.time : '99:99'
  const tb = b.kind === 'appointment' ? b.time : '99:99'
  return ta.localeCompare(tb)
}

/**
 * ¿Cae este item en este día ISO?
 *
 * OJO: NO es una igualdad de fecha. Los eventos clínicos con `endDate` distinto de
 * `date` (hospitalizaciones) abarcan un RANGO y tienen que aparecer en todos sus días
 * intermedios, no solo en el de ingreso.
 */
function itemCoversDay(it: AgendaItem, iso: string): boolean {
  if (it.kind === 'clinical' && it.endDate && it.endDate !== it.date) {
    return iso >= it.date && iso <= it.endDate
  }
  return it.date === iso
}

/** Devuelve los items que caen en un día (ISO yyyy-MM-dd), ordenados por hora. */
export function itemsOnDay(items: AgendaItem[], iso: string): AgendaItem[] {
  return items.filter((it) => itemCoversDay(it, iso)).sort(compareAgendaItems)
}

/**
 * Indexa los items por día ISO, UNA sola vez, para la ventana visible (`isos`).
 *
 * Sustituye al barrido lineal por celda de las vistas mes/semana: `itemsOnDay` se
 * llamaba cuatro veces por celda × 42 celdas = 168 barridos completos + 168 `sort`
 * por render.
 *
 * La expansión de rangos es la parte delicada y el motivo de que esto no sea un
 * `Map` indexado por `it.date`: un índice por fecha de inicio haría DESAPARECER las
 * hospitalizaciones de todos sus días intermedios del calendario, sin ningún error
 * visible. Aquí el item con `endDate` se empuja a cada día que cubre — pero solo
 * dentro de `isos`, para que una hospitalización de 40 días no materialice 40
 * entradas cuando la rejilla solo pinta 42 celdas.
 *
 * El resultado es equivalente, celda a celda, a llamar `itemsOnDay(items, iso)`.
 */
export function indexItemsByDay(items: AgendaItem[], isos: string[]): Map<string, AgendaItem[]> {
  const map = new Map<string, AgendaItem[]>()
  const push = (iso: string, it: AgendaItem): void => {
    const bucket = map.get(iso)
    if (bucket) bucket.push(it)
    else map.set(iso, [it])
  }
  for (const it of items) {
    if (it.kind === 'clinical' && it.endDate && it.endDate !== it.date) {
      // Rango: se expande día a día, acotado a la ventana visible.
      for (const iso of isos) {
        if (iso >= it.date && iso <= it.endDate) push(iso, it)
      }
    } else {
      push(it.date, it)
    }
  }
  for (const bucket of map.values()) bucket.sort(compareAgendaItems)
  return map
}

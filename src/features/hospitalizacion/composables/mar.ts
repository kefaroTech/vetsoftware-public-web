import type { MedicationFrequency, DurationMeasure } from '@/types/domain'
import type { DoseSlot, DoseStatus } from '../types/hospital'
import type { AppliedStatus } from '../api/medicationSchedule.api'

/** Forma mínima común de una toma/ejecución persistida (med o proc). */
export interface ScheduleSlotSource {
  id: number
  currentDateTime: string
  realDateTime: string | null
  appliedStatus: AppliedStatus | null
  createdBy: { name: string }
}

// ─── Motor MAR client-side ────────────────────────────────────────────
// Helpers de fecha/hora + estado efectivo de las tomas. La generación de
// medicación y procedimientos vive ahora en el backend (medication_schedules
// y procedure_schedules); estos slots se mapean con scheduleToDoseSlot.

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const MONTHS_LONG = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

const INDEFINITE_HORIZON_DAYS = 14
const MAX_SLOTS = 80

export function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null
}

/** Normaliza 'HH:mm:ss' o 'HH:mm' a 'HH:mm'. */
export function normalizeTime(t: string | null | undefined): string {
  if (!t) return ''
  return t.slice(0, 5)
}

export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7 // lunes = 0
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Combina date ISO + time 'HH:mm' en un Date local. */
export function combine(dateIso: string, time: string): Date {
  const base = parseISO(dateIso) ?? new Date()
  const [h, m] = normalizeTime(time).split(':').map(Number)
  base.setHours(h || 0, m || 0, 0, 0)
  return base
}

/** Horas del intervalo de una frecuencia, o null si no es discreta. */
export function intervalFromFrequency(f: MedicationFrequency | null): number | null {
  switch (f) {
    case 'EVERY_4H':
      return 4
    case 'EVERY_6H':
      return 6
    case 'EVERY_8H':
      return 8
    case 'EVERY_12H':
      return 12
    case 'EVERY_24H':
      return 24
    default:
      return null // CONTINUOUS / SINGLE / null
  }
}

/** Suma horas a un Date y devuelve { date, time }. */
function addHours(d: Date, hours: number): { date: string; time: string } {
  const next = new Date(d.getTime() + hours * 3600_000)
  return {
    date: isoFromDate(next),
    time: `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(
      2,
      '0',
    )}`,
  }
}

interface BuildArgs {
  orderId: number
  frequency: MedicationFrequency | null
  startDate: string | null
  startTime: string | null
  durationMeasure: DurationMeasure | null
  durationQuantity: number | null
}

/**
 * Genera el calendario de tomas. Las infusiones continuas no producen chips
 * discretos (se muestran como banda en el overview). Estado inicial PENDIENTE;
 * `effectiveDoseStatus` decide ATRASADA según la hora real.
 */
export function buildSchedule(args: BuildArgs): DoseSlot[] {
  const { orderId, frequency, startDate, startTime, durationMeasure, durationQuantity } = args
  if (!startDate) return []
  const time = normalizeTime(startTime) || '08:00'

  if (frequency === 'CONTINUOUS') return []
  if (frequency === 'SINGLE') {
    return [slot(orderId, 0, startDate, time)]
  }

  const intervalH = intervalFromFrequency(frequency)
  if (!intervalH) return []

  let count: number
  if (durationMeasure === 'DOSES' && durationQuantity) {
    count = durationQuantity
  } else if (durationMeasure === 'DAYS' && durationQuantity) {
    count = Math.max(1, Math.floor((durationQuantity * 24) / intervalH))
  } else {
    // INDEFINITE o sin duración → horizonte acotado
    count = Math.floor((INDEFINITE_HORIZON_DAYS * 24) / intervalH)
  }
  count = Math.min(count, MAX_SLOTS)

  const start = combine(startDate, time)
  const slots: DoseSlot[] = []
  for (let i = 0; i < count; i++) {
    const { date, time: t } = addHours(start, i * intervalH)
    slots.push(slot(orderId, i, date, t))
  }
  return slots
}

function slot(orderId: number, i: number, date: string, time: string): DoseSlot {
  return {
    id: `o${orderId}-d${i}`,
    date,
    time,
    status: 'PENDIENTE',
    givenBy: null,
    givenAt: null,
  }
}

const APPLIED_STATUS_MAP: Record<AppliedStatus, DoseStatus> = {
  APPLIED: 'APLICADA',
  PENDING: 'PENDIENTE',
  SKIPPED: 'OMITIDA',
}

/** Convierte una toma/ejecución persistida del backend a DoseSlot (med o proc). */
export function scheduleToDoseSlot(s: ScheduleSlotSource): DoseSlot {
  const [date, rawTime] = s.currentDateTime.split('T')
  const realTime = s.realDateTime ? s.realDateTime.split('T')[1] : null
  return {
    id: String(s.id),
    date,
    time: normalizeTime(rawTime),
    status: s.appliedStatus ? APPLIED_STATUS_MAP[s.appliedStatus] : 'PENDIENTE',
    givenBy: s.realDateTime ? s.createdBy.name : null,
    givenAt: realTime ? normalizeTime(realTime) : null,
  }
}

/** Estado efectivo: PENDIENTE vencida → ATRASADA. */
export function effectiveDoseStatus(slot: DoseSlot, now: Date): DoseStatus {
  if (slot.status !== 'PENDIENTE') return slot.status
  return combine(slot.date, slot.time).getTime() < now.getTime() ? 'ATRASADA' : 'PENDIENTE'
}

/**
 * Recalcula las tomas PENDIENTES posteriores a `appliedId` sumando `intervalH`
 * horas desde la hora real de aplicación (pauta INTERVALO).
 */
export function recalcInterval(
  schedule: DoseSlot[],
  appliedId: string,
  baseDate: string,
  baseTime: string,
  intervalH: number,
): DoseSlot[] {
  const ordered = [...schedule].sort(
    (a, b) => combine(a.date, a.time).getTime() - combine(b.date, b.time).getTime(),
  )
  const idx = ordered.findIndex((s) => s.id === appliedId)
  if (idx < 0) return schedule

  let cursor = combine(baseDate, baseTime)
  for (let i = idx + 1; i < ordered.length; i++) {
    if (ordered[i].status !== 'PENDIENTE') continue
    const next = addHours(cursor, intervalH)
    ordered[i] = { ...ordered[i], date: next.date, time: next.time }
    cursor = combine(next.date, next.time)
  }
  return ordered
}

/** Días transcurridos desde una fecha ISO (para "Día N de internación"). */
export function daysSince(iso: string | null): number {
  const d = parseISO(iso ?? '')
  if (!d) return 0
  const now = new Date()
  const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - d.getTime()
  return Math.max(0, Math.floor(ms / 86_400_000)) + 1
}

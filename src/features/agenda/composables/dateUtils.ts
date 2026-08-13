// Helpers locales sin dependencias externas (no usamos date-fns/dayjs).

export const MONTHS_LONG = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const

export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const

export const WEEKDAYS_FULL = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const

export function isoFromDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

/** Lunes = 0; aplica una semana ISO. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7
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

export function formatMonthLong(d: Date): string {
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

/**
 * `getMonth` devuelve 0-11 y `getDay` 0-6 por especificación, así que el índice
 * nunca se sale de estas tablas. El `??` es inalcanzable: existe para que el tipo
 * diga lo que el runtime ya garantiza, sin sembrar `!` por el fichero.
 */
export function monthName(d: Date): string {
  return MONTHS_LONG[d.getMonth()] ?? MONTHS_LONG[0]
}

export function weekdayName(d: Date): string {
  return WEEKDAYS_FULL[(d.getDay() + 6) % 7] ?? WEEKDAYS_FULL[0]
}

export function formatWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const startMonth = monthName(start).slice(0, 3).toLowerCase()
  const endMonth = monthName(end).slice(0, 3).toLowerCase()
  if (sameMonth) {
    return `${start.getDate()} – ${end.getDate()} ${startMonth} ${end.getFullYear()}`
  }
  return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth} ${end.getFullYear()}`
}

export function formatDayLong(d: Date): string {
  return `${weekdayName(d)}, ${d.getDate()} ${monthName(d).toLowerCase()} ${d.getFullYear()}`
}

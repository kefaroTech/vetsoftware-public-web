const MONTHS_SHORT = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]
const MONTHS_LONG = [
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
]

export function formatEventDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = parseISODate(iso)
  if (!d) return iso
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

export function formatMonthLabel(monthKey: string): string {
  // monthKey: 'yyyy-MM'
  const d = parseISODate(`${monthKey}-01`)
  if (!d) return monthKey
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`
}

export function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function parseISODate(iso: string): Date | null {
  // Acepta yyyy-MM-dd; le agrego T00:00 para que JS no aplique TZ shift
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

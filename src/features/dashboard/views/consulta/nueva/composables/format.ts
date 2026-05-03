export function formatDateLong(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const meses = [
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
  return `${d} de ${meses[m - 1]}, ${y}`
}

export function calcAge(bodIso: string | null | undefined): string {
  if (!bodIso) return '—'
  const bod = new Date(bodIso)
  if (Number.isNaN(bod.getTime())) return '—'
  const now = new Date()
  let years = now.getFullYear() - bod.getFullYear()
  let months = now.getMonth() - bod.getMonth()
  if (now.getDate() < bod.getDate()) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years <= 0 && months <= 0) return 'Recién nacido'
  if (years <= 0) return `${months} mes${months === 1 ? '' : 'es'}`
  if (months === 0) return `${years} año${years === 1 ? '' : 's'}`
  return `${years} año${years === 1 ? '' : 's'} · ${months} m`
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function genderLabel(g: 'F' | 'M' | string): string {
  if (g === 'F') return 'Hembra'
  if (g === 'M') return 'Macho'
  return '—'
}

export function reproductiveLabel(
  r: 'sterilized' | 'unsterilized' | 'unknown' | string,
): string {
  if (r === 'sterilized') return 'Esterilizada'
  if (r === 'unsterilized') return 'No esterilizada'
  if (r === 'unknown') return 'Desconocido'
  return '—'
}

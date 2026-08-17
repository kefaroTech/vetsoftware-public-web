/**
 * Formateo transversal de fechas y nombres.
 *
 * Es el único módulo de formato genérico del front. Sustituye a los tres
 * `format.ts` que llegaron a convivir —`features/compras/composables`,
 * `features/dashboard/views/consulta/nueva/composables` y
 * `features/historia-clinica/composables`— con tres implementaciones distintas
 * de la misma fecha corta y dos de las mismas iniciales. El del asistente de
 * consulta era el peor: vivía a ocho niveles dentro de un wizard y lo
 * importaban el punto de venta, hospitalización, cuentas, laboratorio y los
 * siete modales de acciones, features que no tienen nada que ver con él.
 *
 * Aquí NO entra nada que dependa de un enum del dominio, de un catálogo o de
 * una feature concreta: las etiquetas de enum viven en `domainLabels.ts` y el
 * vocabulario de una feature (estados de factura, métodos de pago) se queda en
 * su feature.
 */

/** Marcador de "sin dato" del sistema de diseño. */
const EMPTY = '—'

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
] as const

const MONTHS_LONG = [
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
] as const

/** `getMonth()` devuelve 0–11 por especificación; el `?? ''` es la guarda que
 * exige `noUncheckedIndexedAccess`, no un caso alcanzable. */
function monthShort(d: Date): string {
  return MONTHS_SHORT[d.getMonth()] ?? ''
}

function monthLong(d: Date): string {
  return MONTHS_LONG[d.getMonth()] ?? ''
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Parsea la parte de fecha de un ISO (`yyyy-MM-dd` o `yyyy-MM-ddTHH:mm:ss`) a
 * medianoche **local**.
 *
 * El `T00:00:00` explícito es lo que evita el corrimiento de zona horaria:
 * `new Date('2026-08-13')` se interpreta como UTC y en Bogotá (UTC-5) cae el
 * día 12. Toda fecha de este módulo pasa por aquí, así que el día que se
 * imprime es el día que mandó el backend.
 *
 * Devuelve `null` si la cadena no empieza por una fecha ISO o si la fecha no
 * existe. Lo segundo hay que comprobarlo a mano: `new Date('2026-02-31')` no
 * es `Invalid Date`, es el 3 de marzo. Una fecha que el backend no puede haber
 * emitido tiene que cantar como dato roto, no imprimirse como otro día.
 */
export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const [, y, mo, day] = m
  const d = new Date(`${y}-${mo}-${day}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  // Sin este ida y vuelta, el desbordamiento del calendario pasa desapercibido.
  if (d.getMonth() !== Number(mo) - 1 || d.getDate() !== Number(day)) return null
  return d
}

/** Fecha de hoy en `yyyy-MM-dd`, en hora local (no UTC). */
export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Fecha corta: `13 ago 2026`. Es el formato por defecto de la aplicación —
 * tablas, tarjetas, líneas de resumen, historia clínica.
 *
 * `empty` es lo que se imprime cuando no hay fecha; por defecto el guion largo
 * del sistema de diseño. Pásale `''` si el hueco debe quedar vacío.
 */
export function formatDateShort(iso: string | null | undefined, empty: string = EMPTY): string {
  if (!iso) return empty
  const d = parseISODate(iso)
  if (!d) return iso
  return `${d.getDate()} ${monthShort(d)} ${d.getFullYear()}`
}

/** Fecha larga: `13 de agosto, 2026`. Para encabezados y frases. */
export function formatDateLong(iso: string | null | undefined, empty: string = EMPTY): string {
  if (!iso) return empty
  const d = parseISODate(iso)
  if (!d) return iso
  return `${d.getDate()} de ${monthLong(d)}, ${d.getFullYear()}`
}

const numericDate = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' })

/**
 * Fecha numérica: `13/08/2026`. **No es lo mismo que `formatDateShort`** — es
 * el formato de las tablas contables de compras (libro de compras, facturas de
 * proveedor, antigüedad de saldos), donde la columna se lee en vertical y el
 * ancho fijo importa más que la legibilidad del mes.
 */
export function formatDateNumeric(iso: string | null | undefined, empty: string = EMPTY): string {
  if (!iso) return empty
  const d = parseISODate(iso)
  if (!d) return iso
  return numericDate.format(d)
}

/** Etiqueta de mes a partir de una clave `yyyy-MM`: `Agosto 2026`. */
export function formatMonthLabel(monthKey: string | null | undefined): string {
  if (!monthKey) return EMPTY
  const d = parseISODate(`${monthKey}-01`)
  if (!d) return monthKey
  return `${capitalize(monthLong(d))} ${d.getFullYear()}`
}

/**
 * Edad legible a partir de la fecha de nacimiento: `3 años · 2 m`,
 * `7 meses`, `Recién nacido`.
 */
export function calcAge(bodIso: string | null | undefined): string {
  const bod = parseISODate(bodIso)
  if (!bod) return EMPTY
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

/** Iniciales para los avatares: hasta dos letras mayúsculas del nombre. */
export function initials(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

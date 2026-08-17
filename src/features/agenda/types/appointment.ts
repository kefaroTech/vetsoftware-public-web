import type { EventTypeColor } from '@/features/historia-clinica/constants/eventTypes'
import {
  TYPE_COLORS,
  type EventTypeColorTokens,
} from '@/features/historia-clinica/constants/eventTypes'

// ── Enums (espejo exacto del backend) ────────────────────────────────
export type AppointmentType =
  | 'CONSULTATION'
  | 'CONTROL'
  | 'VACCINATION'
  | 'DEWORMING'
  | 'SURGERY'
  | 'IMAGING'
  | 'LABORATORY'
  | 'GROOMING'
  | 'OTHER'

export type AppointmentStatus =
  'REQUESTED' | 'CONFIRMED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

// ── Contratos REST ───────────────────────────────────────────────────
export interface AppointmentAnimalRef {
  id: number
  name: string
  code: string | null
}
export interface AppointmentOwnerRef {
  id: number
  name: string
}
export interface AppointmentEmployeeRef {
  id: number
  name: string
}

/**
 * Duración de una cita cuando ni la cita ni la empresa dicen otra cosa.
 *
 * Es el respaldo del backend replicado aquí a propósito (mismo criterio que el UVT en
 * `systemConfig.store`): `CompanySettingsAppointmentDurationPolicy.DEFAULT_MINUTES`. La
 * cadena real es cita → ajuste `appointment.default_duration_minutes` de la empresa → estos
 * 30 minutos; el eslabón del medio lo lee `useAppointmentDuration`, y si esa lectura falla
 * (red, o un usuario sin `company.read`) se conserva este valor para que el aviso de solape
 * del formulario siga funcionando.
 */
export const DEFAULT_APPOINTMENT_DURATION_MINUTES = 30

/** Techo del dominio (`Appointment.MAX_DURATION_MINUTES`): 12 horas. */
export const APPT_MAX_DURATION_MINUTES = 12 * 60

/** Duraciones que ofrece el desplegable del formulario, en minutos. */
export const APPT_DURATION_CHOICES: readonly number[] = [15, 30, 45, 60, 90]

export interface AppointmentResponse {
  id: number
  startAt: string // ISO LocalDateTime "yyyy-MM-ddTHH:mm:ss"
  /**
   * Duración propia de la cita, en minutos. `null` = hereda la duración por defecto de la
   * empresa. El fin nunca viaja: es derivado (`startAt + duración`).
   */
  durationMinutes: number | null
  type: AppointmentType
  status: AppointmentStatus
  notes: string | null
  cancellationReason: string | null
  animal: AppointmentAnimalRef | null
  owner: AppointmentOwnerRef | null
  clientName: string | null
  clientPhone: string | null
  clientEmail: string | null
  employee: AppointmentEmployeeRef
  version: number
  enabled: boolean
  createdDate: string
  /**
   * Citas del mismo veterinario/a con las que ésta comparte hueco. El solape se
   * rechaza con 409 (`APPOINTMENT_OVERLAP`) salvo que se agende forzándolo, así
   * que lo que llega aquí son los solapes que quedaron registrados a propósito.
   */
  overlappingAppointmentIds: number[]
}

export interface CreateAppointmentRequest {
  startAt: string
  /**
   * Duración en minutos (1..720). Omitirla —o mandar `null`— significa «usa la duración por
   * defecto de la empresa»; no significa «sin duración».
   */
  durationMinutes?: number | null
  type: AppointmentType
  employeeId: number
  animalId?: number | null
  ownerId?: number | null
  clientName?: string | null
  clientPhone?: string | null
  // Correo opcional del contacto libre para enviarle la confirmación.
  clientEmail?: string | null
  notes?: string | null
  // Sede en la que se agenda. Se elige en el form (default = sede del menú principal); si no viene, el backend
  // usa la sede activa por defecto. Solo aplica al crear (el update no cambia de sede).
  branchId?: number | null
  /**
   * Agendar aunque el hueco del veterinario/a ya esté ocupado. Sin él, el cruce responde
   * 409 `APPOINTMENT_OVERLAP`; con él, exige además el permiso `appointment.overlap.force`
   * y responde 403 a quien no lo tenga.
   */
  forceOverlap?: boolean
}

/**
 * TR-01: era un alias de `CreateAppointmentRequest`, así que dejaba mandar `branchId` en la
 * edición. `PUT /appointments/{id}` no lo acepta —la cita no cambia de sede, como ya decía el
 * comentario de arriba— y lo descartaba en silencio. Ahora el tipo lo impide.
 */
export type UpdateAppointmentRequest = Omit<CreateAppointmentRequest, 'branchId'>

/**
 * Reprogramar es un PATCH, no un reemplazo: aquí `durationMinutes: null` significa «no toques
 * la duración», al revés que en crear/editar, donde significa «vuelve a la de la empresa».
 */
export interface RescheduleAppointmentRequest {
  startAt: string
  durationMinutes?: number | null
  employeeId: number
  forceOverlap?: boolean
}

export interface ChangeStatusRequest {
  status: AppointmentStatus
}

export interface CancelAppointmentRequest {
  reason?: string | null
}

// ── Modelo de UI (portado de appt-model.jsx) ─────────────────────────
export interface AppointmentTypeMeta {
  label: string
  icon: string
  color: EventTypeColor
}

export const APPT_TYPES: Record<AppointmentType, AppointmentTypeMeta> = {
  CONSULTATION: { label: 'Consulta', icon: '🩺', color: 'amatista' },
  CONTROL: { label: 'Control', icon: '📋', color: 'pink' },
  VACCINATION: { label: 'Vacunación', icon: '💉', color: 'green' },
  DEWORMING: { label: 'Desparasitación', icon: '🪱', color: 'teal' },
  SURGERY: { label: 'Cirugía', icon: '🔪', color: 'red' },
  IMAGING: { label: 'Imagen Dx', icon: '🩻', color: 'indigo' },
  LABORATORY: { label: 'Laboratorio', icon: '🧪', color: 'blue' },
  GROOMING: { label: 'Spa / Estética', icon: '🛁', color: 'amber' },
  OTHER: { label: 'Otro', icon: '✳️', color: 'gray' },
}

export interface AppointmentStatusMeta {
  label: string
  dot: string
  bg: string
  fg: string
}

export const APPT_STATUS: Record<AppointmentStatus, AppointmentStatusMeta> = {
  REQUESTED: {
    label: 'Solicitada',
    dot: 'oklch(65% 0.13 75)',
    bg: 'oklch(95% 0.06 80)',
    fg: 'oklch(45% 0.13 70)',
  },
  CONFIRMED: {
    label: 'Confirmada',
    dot: 'oklch(55% 0.16 240)',
    bg: 'oklch(95% 0.04 240)',
    fg: 'oklch(40% 0.15 240)',
  },
  ARRIVED: {
    label: 'Llegó',
    dot: 'oklch(58% 0.14 200)',
    bg: 'oklch(95% 0.05 200)',
    fg: 'oklch(42% 0.12 200)',
  },
  IN_PROGRESS: {
    label: 'En curso',
    dot: 'var(--amatista-600)',
    bg: 'var(--amatista-100)',
    fg: 'var(--amatista-700)',
  },
  COMPLETED: {
    label: 'Completada',
    dot: 'oklch(55% 0.16 150)',
    bg: 'oklch(95% 0.06 150)',
    fg: 'oklch(40% 0.13 150)',
  },
  NO_SHOW: {
    label: 'No asistió',
    dot: 'oklch(62% 0.14 40)',
    bg: 'oklch(95% 0.04 40)',
    fg: 'oklch(48% 0.15 40)',
  },
  CANCELLED: {
    label: 'Cancelada',
    dot: 'var(--warm-500)',
    bg: 'var(--warm-200)',
    fg: 'var(--warm-600)',
  },
}

// Máquina de estados (transiciones válidas)
export const APPT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['ARRIVED', 'CANCELLED', 'NO_SHOW'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
}

export const APPT_TERMINAL: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  'COMPLETED',
  'NO_SHOW',
  'CANCELLED',
])

// Límites de longitud (alineados con el backend)
export const APPT_NOTES_MAX = 1000
export const APPT_REASON_MAX = 300
export const APPT_CLIENT_NAME_MAX = 120
export const APPT_CLIENT_PHONE_MAX = 30
export const APPT_CLIENT_EMAIL_MAX = 150

// ── Lookups / formatters ─────────────────────────────────────────────
export function apptTypeTokens(type: AppointmentType): EventTypeColorTokens {
  return TYPE_COLORS[APPT_TYPES[type].color]
}

/** "HH:mm" desde un ISO LocalDateTime. */
export function apptTime(iso: string | null | undefined): string {
  return iso ? iso.slice(11, 16) : ''
}

/** "yyyy-MM-dd" desde un ISO LocalDateTime. */
export function apptDate(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function apptHour(iso: string | null | undefined): number {
  return iso ? Number(iso.slice(11, 13)) : 0
}

export function apptInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Hue determinista por empleado para colorear el badge del vet. */
export function apptVetHue(employeeId: number): number {
  return (((employeeId * 57) % 360) + 360) % 360
}

/** Combina fecha (yyyy-MM-dd) + hora (HH:mm) en un ISO LocalDateTime. */
export function toIsoLocalDateTime(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`
}

// ── Intervalos ───────────────────────────────────────────────────────
const ISO_LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{1,2}):(\d{2})/

/**
 * El instante del ISO LocalDateTime como minutos absolutos, para poder compararlo y sumarle
 * duraciones sin aritmética de calendario. `null` si el texto no es un LocalDateTime.
 *
 * Se apoya en `Date.UTC` a propósito: el ISO del backend es hora de pared sin zona, así que
 * interpretarlo en UTC lo convierte en un número estable —el mismo en Bogotá y en CI— y de
 * paso cruza bien los bordes de mes y de año. Los segundos se descartan: el minuto es la
 * unidad de la agenda.
 */
export function apptStartMinutes(iso: string | null | undefined): number | null {
  const m = iso ? ISO_LOCAL_DATE_TIME.exec(iso) : null
  if (!m) return null
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) / 60_000
}

/**
 * Duración efectiva en minutos: la propia de la cita si la tiene, y si no la de la empresa.
 * Un valor no positivo se trata como ausente — el backend hace lo mismo al parsear el ajuste.
 */
export function apptDuration(
  durationMinutes: number | null | undefined,
  defaultDurationMinutes: number = DEFAULT_APPOINTMENT_DURATION_MINUTES,
): number {
  if (durationMinutes != null && durationMinutes > 0) return durationMinutes
  return defaultDurationMinutes > 0 ? defaultDurationMinutes : DEFAULT_APPOINTMENT_DURATION_MINUTES
}

/** "HH:mm" de la hora de fin (inicio + duración efectiva), o '' si no hay inicio. */
export function apptEndTime(
  startAt: string | null | undefined,
  durationMinutes: number | null | undefined,
  defaultDurationMinutes?: number,
): string {
  const start = apptStartMinutes(startAt)
  if (start === null) return ''
  const end = new Date((start + apptDuration(durationMinutes, defaultDurationMinutes)) * 60_000)
  const hh = String(end.getUTCHours()).padStart(2, '0')
  const mm = String(end.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/** "09:00–09:45". Si no hay inicio devuelve ''. */
export function apptTimeRange(
  startAt: string | null | undefined,
  durationMinutes: number | null | undefined,
  defaultDurationMinutes?: number,
): string {
  const end = apptEndTime(startAt, durationMinutes, defaultDurationMinutes)
  return end ? `${apptTime(startAt)}–${end}` : ''
}

/**
 * Vista previa del choque de horario, en el cliente: mismo vet, intervalos que se cruzan,
 * ambos activos y no-terminales.
 *
 * **La intersección es semiabierta**: cada cita ocupa `[inicio, inicio + duración)`, así que
 * una de 10:00 a 10:30 y otra de 10:30 a 11:00 NO chocan. Es la misma regla que aplica el
 * backend (`startAt.isBefore(slotEnd) && slot.startAt.isBefore(endAt)`); si aquí se cerrara
 * el intervalo, cada par de citas consecutivas daría un conflicto falso y el aviso sería
 * ruido que el usuario aprende a ignorar.
 *
 * La cita que no declara duración hereda `defaultDurationMinutes` — el ajuste
 * `appointment.default_duration_minutes` de la empresa, que pasa `useAppointmentDuration`.
 * Sigue siendo una ayuda visual: quien decide es el backend, que responde 409
 * (`APPOINTMENT_OVERLAP`) cuando el hueco está ocupado.
 *
 * Comportamiento fijado en `tests/unit/agenda-appointment.spec.ts`.
 */
export function apptClashes(
  list: AppointmentResponse[],
  candidate: {
    id?: number
    employeeId: number
    startAt: string
    status: AppointmentStatus
    durationMinutes?: number | null
  },
  defaultDurationMinutes: number = DEFAULT_APPOINTMENT_DURATION_MINUTES,
): AppointmentResponse[] {
  if (APPT_TERMINAL.has(candidate.status)) return []
  const start = apptStartMinutes(candidate.startAt)
  if (start === null) return []
  const end = start + apptDuration(candidate.durationMinutes, defaultDurationMinutes)

  return list.filter((o) => {
    if (o.id === candidate.id) return false
    if (o.enabled === false) return false
    if (o.employee.id !== candidate.employeeId) return false
    if (APPT_TERMINAL.has(o.status)) return false
    const otherStart = apptStartMinutes(o.startAt)
    if (otherStart === null) return false
    const otherEnd = otherStart + apptDuration(o.durationMinutes, defaultDurationMinutes)
    return start < otherEnd && otherStart < end
  })
}

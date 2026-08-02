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

export interface AppointmentResponse {
  id: number
  startAt: string // ISO LocalDateTime "yyyy-MM-ddTHH:mm:ss"
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
  /** Aviso de choque (mismo vet + misma hora). NUNCA bloquea. */
  overlappingAppointmentIds: number[]
}

export interface CreateAppointmentRequest {
  startAt: string
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
}

export type UpdateAppointmentRequest = CreateAppointmentRequest

export interface RescheduleAppointmentRequest {
  startAt: string
  employeeId: number
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

/**
 * Choque de horario (§4.3): mismo vet, misma hora de inicio (al minuto), ambos
 * activos y no-terminales. Es sólo un aviso — nunca bloquea.
 */
export function apptClashes(
  list: AppointmentResponse[],
  candidate: { id?: number; employeeId: number; startAt: string; status: AppointmentStatus },
): AppointmentResponse[] {
  if (APPT_TERMINAL.has(candidate.status)) return []
  return list.filter(
    (o) =>
      o.id !== candidate.id &&
      o.enabled !== false &&
      o.employee.id === candidate.employeeId &&
      o.startAt.slice(0, 16) === candidate.startAt.slice(0, 16) &&
      !APPT_TERMINAL.has(o.status),
  )
}

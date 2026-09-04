import type { ClinicalEventType } from '../types/historia'

export type EventTypeColor =
  'amatista' | 'red' | 'green' | 'teal' | 'amber' | 'blue' | 'indigo' | 'pink' | 'gray'

export interface EventTypeMeta {
  label: string
  color: EventTypeColor
  icon: string
}

export const EVENT_TYPES: Record<ClinicalEventType, EventTypeMeta> = {
  CONSULTATION: { label: 'Consulta', color: 'amatista', icon: '🩺' },
  SURGERY: { label: 'Cirugía', color: 'red', icon: '🔪' },
  VACCINATION: { label: 'Vacunación', color: 'green', icon: '💉' },
  DEWORMING: { label: 'Desparasitación', color: 'teal', icon: '🪱' },
  HOSPITALIZATION: { label: 'Hospitalización', color: 'amber', icon: '🏥' },
  LABORATORY_TEST: { label: 'Laboratorio', color: 'blue', icon: '🧪' },
  DIAGNOSTIC_IMAGING: { label: 'Imagen Dx', color: 'indigo', icon: '🩻' },
  PRESCRIPTION: { label: 'Plan terapéutico', color: 'pink', icon: '💊' },
  SPA: { label: 'Spa', color: 'gray', icon: '🛁' },
}

export interface EventTypeColorTokens {
  bg: string
  fg: string
  dot: string
}

export const TYPE_COLORS: Record<EventTypeColor, EventTypeColorTokens> = {
  amatista: {
    bg: 'var(--amatista-100)',
    fg: 'var(--amatista-700)',
    dot: 'var(--amatista-600)',
  },
  red: {
    bg: 'var(--danger-150)',
    fg: 'var(--danger-700)',
    dot: 'var(--danger-border)',
  },
  green: {
    bg: 'var(--success-bg)',
    fg: 'var(--success-fg)',
    dot: 'var(--success-dot)',
  },
  teal: {
    bg: 'var(--teal-100, var(--compras-ok-bg))',
    fg: 'var(--teal-700, var(--compras-ok-fg))',
    dot: 'var(--teal-600, var(--success-border))',
  },
  amber: {
    bg: 'var(--warning-50)',
    fg: 'var(--warning-900)',
    dot: 'var(--warning-border)',
  },
  blue: {
    bg: 'var(--navy-100, var(--amatista-50))',
    fg: 'var(--navy-700, var(--amatista-600))',
    dot: 'var(--navy-600, var(--amatista-500))',
  },

  /* Ancla violet (292,6°) y no la indigo (277°): a 1° de `--hue` este chip
     queda indistinguible del estado primario y del seleccionado, que son los
     dos únicos colores con los que no puede confundirse. */
  indigo: {
    bg: 'var(--violet-100, var(--amatista-200))',
    fg: 'var(--violet-700, var(--amatista-900))',
    dot: 'var(--violet-600, var(--amatista-700))',
  },

  /* Escalón profundo del ancla indigo, no un tono propio: la marca declara
     cuatro anclas cromáticas y esta tabla necesita nueve tonos distinguibles,
     así que el noveno se separa por claridad sobre un ancla que ya existe. */
  pink: {
    bg: 'var(--amatista-200)',
    fg: 'var(--amatista-800)',
    dot: 'var(--amatista-500)',
  },
  gray: {
    bg: 'var(--warm-200)',
    fg: 'var(--warm-700)',
    dot: 'var(--warm-500)',
  },
}

export const EVENT_TYPE_DETAILABLE: ReadonlySet<ClinicalEventType> = new Set<ClinicalEventType>([
  'CONSULTATION',
  'SURGERY',
  'VACCINATION',
  'DEWORMING',
  'HOSPITALIZATION',
  'LABORATORY_TEST',
  'DIAGNOSTIC_IMAGING',
  'PRESCRIPTION',
  'SPA',
])

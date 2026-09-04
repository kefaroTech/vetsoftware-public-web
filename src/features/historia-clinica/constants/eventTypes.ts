import type { Component } from 'vue'
import {
  Bath,
  BedDouble,
  Bug,
  FlaskConical,
  Pill,
  ScanLine,
  Scissors,
  Stethoscope,
  Syringe,
} from 'lucide-vue-next'
import type { ClinicalEventType } from '../types/historia'

export type EventTypeColor =
  'amatista' | 'red' | 'green' | 'teal' | 'amber' | 'blue' | 'indigo' | 'pink' | 'gray'

export interface EventTypeMeta {
  label: string
  color: EventTypeColor
  /**
   * Componente Lucide, no un literal de emoji: el glifo de un emoji lo elige la
   * fuente del sistema operativo, así que no es el mismo dibujo en Windows, en
   * Android y en el kiosco de recepción — y el de radiografía (U+1FA7B, Unicode
   * 14.0) ni siquiera tiene glifo en equipos sin actualizar, que pintan una caja
   * vacía.
   */
  icon: Component
}

export const EVENT_TYPES: Record<ClinicalEventType, EventTypeMeta> = {
  CONSULTATION: { label: 'Consulta', color: 'amatista', icon: Stethoscope },
  SURGERY: { label: 'Cirugía', color: 'red', icon: Scissors },
  VACCINATION: { label: 'Vacunación', color: 'green', icon: Syringe },
  DEWORMING: { label: 'Desparasitación', color: 'teal', icon: Bug },
  HOSPITALIZATION: { label: 'Hospitalización', color: 'amber', icon: BedDouble },
  LABORATORY_TEST: { label: 'Laboratorio', color: 'blue', icon: FlaskConical },
  DIAGNOSTIC_IMAGING: { label: 'Imagen Dx', color: 'indigo', icon: ScanLine },
  PRESCRIPTION: { label: 'Plan terapéutico', color: 'pink', icon: Pill },
  SPA: { label: 'Spa', color: 'gray', icon: Bath },
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
    bg: 'oklch(94% 0.05 25)',
    fg: 'oklch(48% 0.18 25)',
    dot: 'oklch(60% 0.20 25)',
  },
  green: {
    bg: 'oklch(94% 0.06 150)',
    fg: 'oklch(40% 0.13 150)',
    dot: 'oklch(55% 0.16 150)',
  },
  teal: {
    bg: 'oklch(94% 0.05 200)',
    fg: 'oklch(42% 0.12 200)',
    dot: 'oklch(58% 0.14 200)',
  },
  amber: {
    bg: 'oklch(94% 0.07 80)',
    fg: 'oklch(45% 0.13 70)',
    dot: 'oklch(65% 0.13 75)',
  },
  blue: {
    bg: 'oklch(94% 0.04 240)',
    fg: 'oklch(40% 0.15 240)',
    dot: 'oklch(55% 0.16 240)',
  },
  indigo: {
    bg: 'oklch(94% 0.05 280)',
    fg: 'oklch(40% 0.16 280)',
    dot: 'oklch(55% 0.18 280)',
  },
  pink: {
    bg: 'oklch(94% 0.05 340)',
    fg: 'oklch(42% 0.15 340)',
    dot: 'oklch(60% 0.17 340)',
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

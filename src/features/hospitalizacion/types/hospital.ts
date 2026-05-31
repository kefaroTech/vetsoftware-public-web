import type {
  MedicationFrequency,
  GuidelineType,
  DurationMeasure,
} from '@/types/domain'
import type { HospitalizationMedicationResponse } from '../api/hospitalizationMedication.api'
import type { HospitalizationProcedureResponse } from '../api/hospitalizationProcedure.api'

// ─── MAR (client-side, volátil) ───────────────────────────────────────
// El backend aún no persiste el calendario de dosis; estos tipos viven solo
// en memoria mientras dura la sesión. Ver §16 del handoff.

export type DoseStatus = 'APLICADA' | 'PENDIENTE' | 'ATRASADA' | 'OMITIDA'

export interface DoseSlot {
  id: string
  date: string // ISO yyyy-MM-dd
  time: string // HH:mm
  status: DoseStatus
  givenBy: string | null
  givenAt: string | null // HH:mm
}

export type OrderKind = 'med' | 'proc'

/** Orden de medicamento + su calendario de tomas computado en cliente. */
export interface MedOrderVM extends HospitalizationMedicationResponse {
  kind: 'med'
  schedule: DoseSlot[]
}

/** Orden de procedimiento + su calendario computado en cliente. */
export interface ProcOrderVM extends HospitalizationProcedureResponse {
  kind: 'proc'
  schedule: DoseSlot[]
}

export type OrderVM = MedOrderVM | ProcOrderVM

// ─── Estado clínico del paciente (no existe en backend → client-side) ──
export type HospStatus = 'ESTABLE' | 'OBSERVACION' | 'CRITICO'

// ─── Etiquetas en español ─────────────────────────────────────────────

export const FREQUENCY_LABEL: Record<MedicationFrequency, string> = {
  CONTINUOUS: 'Continua',
  EVERY_4H: 'Cada 4 h',
  EVERY_6H: 'Cada 6 h',
  EVERY_8H: 'Cada 8 h',
  EVERY_12H: 'Cada 12 h',
  EVERY_24H: 'Cada 24 h',
  SINGLE: 'Única',
}

export const GUIDELINE_LABEL: Record<GuidelineType, string> = {
  FIXED: 'Fija (horas de reloj)',
  INTERVAL: 'Por intervalo',
}

export const DURATION_LABEL: Record<DurationMeasure, string> = {
  DAYS: 'días',
  DOSES: 'tomas',
  INDEFINITE: 'Hasta nueva orden',
}

export function frequencyLabel(f: MedicationFrequency | null): string {
  return f ? FREQUENCY_LABEL[f] : '—'
}

export function guidelineLabel(g: GuidelineType | null): string {
  return g ? GUIDELINE_LABEL[g] : '—'
}

/** "por 3 días" / "hasta completar 15 tomas" / "hasta nueva orden". */
export function durationLabel(
  measure: DurationMeasure | null,
  quantity: number | null,
): string {
  if (!measure || measure === 'INDEFINITE') return 'Hasta nueva orden'
  if (measure === 'DAYS') return `Por ${quantity ?? '—'} día${quantity === 1 ? '' : 's'}`
  return `Hasta completar ${quantity ?? '—'} toma${quantity === 1 ? '' : 's'}`
}

export const STATUS_META: Record<
  HospStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  ESTABLE: {
    label: 'Estable',
    bg: 'oklch(94% 0.06 150)',
    fg: 'oklch(40% 0.13 150)',
    dot: 'oklch(55% 0.15 150)',
  },
  OBSERVACION: {
    label: 'En observación',
    bg: 'oklch(94% 0.07 80)',
    fg: 'oklch(45% 0.13 70)',
    dot: 'oklch(65% 0.15 75)',
  },
  CRITICO: {
    label: 'Crítico',
    bg: 'oklch(93% 0.06 25)',
    fg: 'oklch(48% 0.18 25)',
    dot: 'oklch(60% 0.18 25)',
  },
}

import type { MedicationFrequency, GuidelineType, DurationMeasure } from '@/types/domain'

/** Payload de creación — el backend deriva createdBy del JWT. */
export interface CreateHospitalizationMedicationPayload {
  name: string
  dose: string | null
  frequency: MedicationFrequency | null
  guidelineType: GuidelineType | null
  durationMeasure: DurationMeasure | null
  durationQuantity: number | null
  startDate: string | null
  startTime: string | null // 'HH:mm'
  notes: string | null
  hospitalizationId: number
}

/** Update reusa los mismos campos sin hospitalizationId (inmutable). */
export type UpdateHospitalizationMedicationPayload = Omit<
  CreateHospitalizationMedicationPayload,
  'hospitalizationId'
>

export interface MedicationEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface MedicationHospitalizationSummary {
  id: number
  date: string
}

export interface HospitalizationMedicationResponse {
  id: number
  name: string
  dose: string | null
  frequency: MedicationFrequency | null
  guidelineType: GuidelineType | null
  durationMeasure: DurationMeasure | null
  durationQuantity: number | null
  startDate: string | null
  startTime: string | null
  notes: string | null
  hospitalization: MedicationHospitalizationSummary
  createdBy: MedicationEmployeeSummary
  createdDate: string
  enabled: boolean
  suspensionDate: string | null
  suspensionBy: MedicationEmployeeSummary | null
}

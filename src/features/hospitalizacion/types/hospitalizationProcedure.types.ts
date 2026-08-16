import type { MedicationFrequency, GuidelineType, DurationMeasure } from '@/types/domain'

/** Procedimientos: igual que medicación, `dose` opcional y normalmente vacío. */
export interface CreateHospitalizationProcedurePayload {
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

export type UpdateHospitalizationProcedurePayload = Omit<
  CreateHospitalizationProcedurePayload,
  'hospitalizationId'
>

export interface ProcedureEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface ProcedureHospitalizationSummary {
  id: number
  date: string
}

export interface HospitalizationProcedureResponse {
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
  hospitalization: ProcedureHospitalizationSummary
  createdBy: ProcedureEmployeeSummary
  createdDate: string
  enabled: boolean
  suspensionDate: string | null
  suspensionBy: ProcedureEmployeeSummary | null
}

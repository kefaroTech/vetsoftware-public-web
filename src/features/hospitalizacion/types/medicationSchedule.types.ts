/** Espejo de com.vetsoftware.app.medicationschedule.domain.AppliedStatus */
export type AppliedStatus = 'PENDING' | 'APPLIED' | 'SKIPPED'

export interface MedicationScheduleEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface MedicationScheduleResponse {
  id: number
  hospitalizationMedication: { id: number; name: string }
  originalDateTime: string // ISO LocalDateTime 'yyyy-MM-ddTHH:mm:ss'
  currentDateTime: string
  realDateTime: string | null
  appliedStatus: AppliedStatus | null
  rescheduled: boolean | null
  createdBy: MedicationScheduleEmployeeSummary
  createdDate: string
  enabled: boolean
}

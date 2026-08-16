import type { AppliedStatus } from './medicationSchedule.types'

export interface ProcedureScheduleEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface ProcedureScheduleResponse {
  id: number
  hospitalizationProcedure: { id: number; name: string }
  originalDateTime: string // ISO LocalDateTime 'yyyy-MM-ddTHH:mm:ss'
  currentDateTime: string
  realDateTime: string | null
  appliedStatus: AppliedStatus | null
  rescheduled: boolean | null
  createdBy: ProcedureScheduleEmployeeSummary
  createdDate: string
  enabled: boolean
}

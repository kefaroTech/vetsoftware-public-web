export interface CreateHospitalizationProgressNotePayload {
  description: string
  hospitalizationId: number
}

export interface ProgressNoteEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface HospitalizationProgressNoteResponse {
  id: number
  description: string
  hospitalization: { id: number; date: string }
  createdBy: ProgressNoteEmployeeSummary
  createdDate: string // ISO LocalDateTime
  enabled: boolean
}

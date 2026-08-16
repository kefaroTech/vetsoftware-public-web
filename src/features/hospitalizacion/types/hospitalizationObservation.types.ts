export interface CreateHospitalizationObservationPayload {
  description: string
  hospitalizationId: number
}

export interface ObservationEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface HospitalizationObservationResponse {
  id: number
  description: string
  hospitalization: { id: number; date: string }
  createdBy: ObservationEmployeeSummary
  createdDate: string // ISO LocalDateTime
  enabled: boolean
}

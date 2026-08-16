export interface MedicamentCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface MedicamentResponse {
  id: number
  name: string
  description: string | null
  company: MedicamentCompanySummary | null
  general: boolean
  createdDate: string
  enabled: boolean
}

export interface CreateMedicamentPayload {
  name: string
  description: string
}

export interface UpdateMedicamentPayload {
  name: string
  description: string
}

export interface CreateSurgeryPayload {
  date: string
  surgeryTypeId: number
  description: string
  medicament: string
  observations: string
  complications: string
  animalId: number
  consultationId: number | null
}

export interface SurgeryTypeSummary {
  id: number
  name: string
}

export interface SurgeryAnimalSummary {
  id: number
  name: string
  code: string
}

export interface SurgeryConsultationSummary {
  id: number
  date: string
}

export interface SurgeryCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface SurgeryResponse {
  id: number
  date: string
  surgeryType: SurgeryTypeSummary
  description: string
  medicament: string
  observations: string
  complications: string
  animal: SurgeryAnimalSummary
  consultation: SurgeryConsultationSummary | null
  company: SurgeryCompanySummary
  createdDate: string
}

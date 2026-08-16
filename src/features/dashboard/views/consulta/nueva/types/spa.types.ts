export interface CreateSpaPayload {
  date: string
  spaTypeId: number
  reason: string
  details: string
  observations: string
  animalId: number
  companyId: number
}

export interface SpaTypeSummary {
  id: number
  name: string
}

export interface SpaAnimalSummary {
  id: number
  name: string
  code: string
}

export interface SpaCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface SpaResponse {
  id: number
  date: string
  spaType: SpaTypeSummary
  reason: string
  details: string
  observations: string
  animal: SpaAnimalSummary
  company: SpaCompanySummary
  createdDate: string
}

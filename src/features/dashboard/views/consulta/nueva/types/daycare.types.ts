export interface CreateDayCarePayload {
  date: string
  startDate: string
  endDate?: string
  type: 'DAYCARE' | 'HOTEL'
  objects?: string
  observations?: string
  animalId: number
}

export interface DayCareAnimalSummary {
  id: number
  name: string
  code: string
}

export interface DayCareCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface DayCareResponse {
  id: number
  date: string
  startDate: string
  endDate?: string
  type: 'DAYCARE' | 'HOTEL'
  objects?: string
  observations?: string
  animal: DayCareAnimalSummary
  company: DayCareCompanySummary
  createdDate: string
}

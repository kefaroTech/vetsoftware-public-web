export interface CreateVaccinationPayload {
  date: string
  vaccinationTypeId: number
  lot: string
  notes: string
  nextVaccination: string | null
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface VaccinationTypeSummary {
  id: number
  name: string
}

export interface VaccinationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface VaccinationConsultationSummary {
  id: number
  date: string
}

export interface VaccinationCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface VaccinationResponse {
  id: number
  date: string
  vaccinationType: VaccinationTypeSummary
  lot: string
  notes: string
  nextVaccination: string | null
  animal: VaccinationAnimalSummary
  consultation: VaccinationConsultationSummary | null
  company: VaccinationCompanySummary
  createdDate: string
}

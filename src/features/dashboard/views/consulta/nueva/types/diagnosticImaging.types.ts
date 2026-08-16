export interface CreateDiagnosticImagingPayload {
  date: string
  diagnosticImagingTypeId: number
  clinicalSigns: string
  studyType: string
  diagnosis: string
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface DiagnosticImagingTypeSummary {
  id: number
  name: string
}

export interface DiagnosticImagingAnimalSummary {
  id: number
  name: string
  code: string
}

export interface DiagnosticImagingConsultationSummary {
  id: number
  date: string
}

export interface DiagnosticImagingCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface DiagnosticImagingResponse {
  id: number
  date: string
  diagnosticImagingType: DiagnosticImagingTypeSummary
  clinicalSigns: string
  studyType: string
  diagnosis: string
  observations: string
  animal: DiagnosticImagingAnimalSummary
  consultation: DiagnosticImagingConsultationSummary | null
  company: DiagnosticImagingCompanySummary
  createdDate: string
}

import type { LaboratoryTestPriority, LaboratoryTestStatus } from '@/types/domain'

export interface CreateLaboratoryTestPayload {
  date: string
  testTypeId: number
  quantity: number
  diagnosis: string
  status?: LaboratoryTestStatus
  prioridad?: LaboratoryTestPriority
  animalId: number
  consultationId: number | null
  companyId: number
  // Sede de la muestra. Si no viene explícita, se inyecta la sede del menú principal (contexto multi-sucursal).
  branchId?: number | null
}

export interface LaboratoryTestEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface LaboratoryTestTypeSummary {
  id: number
  name: string
}

export interface LaboratoryTestAnimalSummary {
  id: number
  name: string
  code: string
}

export interface LaboratoryTestConsultationSummary {
  id: number
  date: string
}

export interface LaboratoryTestCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface LaboratoryTestResponse {
  id: number
  date: string
  testType: LaboratoryTestTypeSummary
  quantity: number
  diagnosis: string
  status: LaboratoryTestStatus
  prioridad: LaboratoryTestPriority
  animal: LaboratoryTestAnimalSummary
  consultation: LaboratoryTestConsultationSummary | null
  company: LaboratoryTestCompanySummary
  processedBy: LaboratoryTestEmployeeSummary | null
  processedDate: string | null
  createdDate: string
}

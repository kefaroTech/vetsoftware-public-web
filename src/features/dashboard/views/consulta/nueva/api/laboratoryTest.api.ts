import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import { withBranchBody } from '@/features/branches/api/branchContext'
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

export const laboratoryTestApi = {
  async create(payload: CreateLaboratoryTestPayload): Promise<LaboratoryTestResponse> {
    // Multi-sucursal: si el payload no trae branchId, se usa la sede del menú principal.
    const { data } = await http.post<LaboratoryTestResponse>(
      '/laboratory-tests',
      withBranchBody(payload),
    )
    return data
  },

  async listAll(): Promise<LaboratoryTestResponse[]> {
    const { data } = await http.get<LaboratoryTestResponse[]>('/laboratory-tests')
    return data
  },

  async listByAnimal(
    animalId: number,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<LaboratoryTestResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<LaboratoryTestResponse>>(
      `/laboratory-tests/by-animal/${animalId}`,
      {
        params: { page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<LaboratoryTestResponse> {
    const { data } = await http.get<LaboratoryTestResponse>(`/laboratory-tests/${id}`)
    return data
  },

  async update(id: number, payload: CreateLaboratoryTestPayload): Promise<LaboratoryTestResponse> {
    const { data } = await http.put<LaboratoryTestResponse>(`/laboratory-tests/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/laboratory-tests/${id}`)
  },

  async changeStatus(id: number, status: LaboratoryTestStatus): Promise<LaboratoryTestResponse> {
    const { data } = await http.patch<LaboratoryTestResponse>(`/laboratory-tests/${id}/status`, {
      status,
    })
    return data
  },
}

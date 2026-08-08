import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

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

export const diagnosticImagingApi = {
  async create(payload: CreateDiagnosticImagingPayload): Promise<DiagnosticImagingResponse> {
    const { data } = await http.post<DiagnosticImagingResponse>('/diagnostic-imagings', payload)
    return data
  },

  async listAll(): Promise<DiagnosticImagingResponse[]> {
    const { data } = await http.get<DiagnosticImagingResponse[]>('/diagnostic-imagings')
    return data
  },

  async listByAnimal(
    animalId: number,
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<DiagnosticImagingResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<DiagnosticImagingResponse>>(
      `/diagnostic-imagings/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<DiagnosticImagingResponse> {
    const { data } = await http.get<DiagnosticImagingResponse>(`/diagnostic-imagings/${id}`)
    return data
  },

  async update(
    id: number,
    payload: CreateDiagnosticImagingPayload,
  ): Promise<DiagnosticImagingResponse> {
    const { data } = await http.put<DiagnosticImagingResponse>(
      `/diagnostic-imagings/${id}`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/diagnostic-imagings/${id}`)
  },
}

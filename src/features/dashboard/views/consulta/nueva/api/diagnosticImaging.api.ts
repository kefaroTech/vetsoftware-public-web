import type {
  CreateDiagnosticImagingPayload,
  DiagnosticImagingResponse,
} from '../types/diagnosticImaging.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

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

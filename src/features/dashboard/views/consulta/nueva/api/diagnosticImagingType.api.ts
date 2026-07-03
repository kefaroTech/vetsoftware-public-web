import { http } from '@/services/http/http.client'

export interface DiagnosticImagingTypeResponse {
  id: number
  name: string
  description: string | null
  createdDate: string
}

export interface CreateDiagnosticImagingTypePayload {
  name: string
  description: string
}

export const diagnosticImagingTypeApi = {
  async listAll(): Promise<DiagnosticImagingTypeResponse[]> {
    const { data } = await http.get<DiagnosticImagingTypeResponse[]>(
      '/diagnostic-imaging-types/available',
    )
    return data
  },

  async create(
    payload: CreateDiagnosticImagingTypePayload,
  ): Promise<DiagnosticImagingTypeResponse> {
    const { data } = await http.post<DiagnosticImagingTypeResponse>(
      '/diagnostic-imaging-types',
      payload,
    )
    return data
  },
}

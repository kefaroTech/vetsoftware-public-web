import { http } from '@/services/http/http.client'

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

export interface DiagnosticImagingResponse {
  id: number
  date: string
  studyType: string
  clinicalSigns: string
  diagnosis: string
  observations: string
  createdDate: string
}

export const diagnosticImagingApi = {
  async create(
    payload: CreateDiagnosticImagingPayload,
  ): Promise<DiagnosticImagingResponse> {
    const { data } = await http.post<DiagnosticImagingResponse>(
      '/diagnostic-imagings',
      payload,
    )
    return data
  },
}

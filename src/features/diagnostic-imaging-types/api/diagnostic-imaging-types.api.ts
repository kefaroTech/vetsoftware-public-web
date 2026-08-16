import type {
  DiagnosticImagingTypeResponse,
  CreateDiagnosticImagingTypePayload,
} from '../types/diagnostic-imaging-types.types'
import { http } from '@/services/http/http.client'

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

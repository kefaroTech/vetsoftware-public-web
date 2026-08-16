import type { CreatePrescriptionPayload, PrescriptionResponse } from '../types/prescription.types'
import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'

export const prescriptionApi = {
  async create(payload: CreatePrescriptionPayload): Promise<PrescriptionResponse> {
    const { data } = await http.post<PrescriptionResponse>('/prescriptions', payload)
    return data
  },

  async findById(id: number): Promise<PrescriptionResponse> {
    const { data } = await http.get<PrescriptionResponse>(`/prescriptions/${id}`)
    return data
  },

  async exportPdf(id: number): Promise<Blob> {
    const { data } = await http.get<Blob>(`/prescriptions/${id}/export.pdf`, {
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return data
  },
}

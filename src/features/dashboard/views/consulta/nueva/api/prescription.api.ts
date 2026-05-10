import { http } from '@/services/http/http.client'

export interface CreatePrescriptionPayload {
  date: string
  diagnosis: string
  observations: string
  animalId: number
  consultationId: number
  companyId: number
}

export interface PrescriptionResponse {
  id: number
  date: string
  diagnosis: string
  observations: string
  createdDate: string
}

export const prescriptionApi = {
  async create(payload: CreatePrescriptionPayload): Promise<PrescriptionResponse> {
    const { data } = await http.post<PrescriptionResponse>('/prescriptions', payload)
    return data
  },
}

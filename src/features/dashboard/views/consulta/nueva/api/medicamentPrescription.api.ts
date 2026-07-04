import { http } from '@/services/http/http.client'

export interface CreateMedicamentPrescriptionPayload {
  name: string
  presentation: string
  quantity: number
  posology: string
  observation: string | null
  prescriptionId: number
}

export interface MedicamentPrescriptionResponse {
  id: number
  name: string
  presentation: string
  quantity: number
  posology: string
  observation: string | null
  createdDate: string
}

export const medicamentPrescriptionApi = {
  async create(
    payload: CreateMedicamentPrescriptionPayload,
  ): Promise<MedicamentPrescriptionResponse> {
    const { data } = await http.post<MedicamentPrescriptionResponse>(
      '/medicament-prescriptions',
      payload,
    )
    return data
  },
}

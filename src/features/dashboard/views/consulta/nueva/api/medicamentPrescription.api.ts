import type {
  CreateMedicamentPrescriptionPayload,
  MedicamentPrescriptionResponse,
} from '../types/medicamentPrescription.types'
import { http } from '@/services/http/http.client'

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

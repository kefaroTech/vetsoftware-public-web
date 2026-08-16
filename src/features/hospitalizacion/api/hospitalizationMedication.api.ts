import type {
  CreateHospitalizationMedicationPayload,
  UpdateHospitalizationMedicationPayload,
  HospitalizationMedicationResponse,
} from '../types/hospitalizationMedication.types'
import { http } from '@/services/http/http.client'
const BASE = '/hospitalization-medications'

export const hospitalizationMedicationApi = {
  async create(
    payload: CreateHospitalizationMedicationPayload,
  ): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.post<HospitalizationMedicationResponse>(BASE, payload)
    return data
  },

  async update(
    id: number,
    payload: UpdateHospitalizationMedicationPayload,
  ): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.put<HospitalizationMedicationResponse>(`${BASE}/${id}`, payload)
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationMedicationResponse[]> {
    const { data } = await http.get<HospitalizationMedicationResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },

  /** Suspende la medicación (registra suspensionDate/By). */
  async suspend(id: number): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.patch<HospitalizationMedicationResponse>(`${BASE}/${id}/suspend`)
    return data
  },
}

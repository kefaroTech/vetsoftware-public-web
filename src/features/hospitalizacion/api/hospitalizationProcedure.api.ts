import type {
  CreateHospitalizationProcedurePayload,
  UpdateHospitalizationProcedurePayload,
  HospitalizationProcedureResponse,
} from '../types/hospitalizationProcedure.types'
import { http } from '@/services/http/http.client'
const BASE = '/hospitalization-procedures'

export const hospitalizationProcedureApi = {
  async create(
    payload: CreateHospitalizationProcedurePayload,
  ): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.post<HospitalizationProcedureResponse>(BASE, payload)
    return data
  },

  async update(
    id: number,
    payload: UpdateHospitalizationProcedurePayload,
  ): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.put<HospitalizationProcedureResponse>(`${BASE}/${id}`, payload)
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationProcedureResponse[]> {
    const { data } = await http.get<HospitalizationProcedureResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },

  /** Suspende el procedimiento (registra suspensionDate/By). */
  async suspend(id: number): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.patch<HospitalizationProcedureResponse>(`${BASE}/${id}/suspend`)
    return data
  },
}

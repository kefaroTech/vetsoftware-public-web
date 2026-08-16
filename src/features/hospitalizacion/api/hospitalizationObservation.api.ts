import type {
  CreateHospitalizationObservationPayload,
  HospitalizationObservationResponse,
} from '../types/hospitalizationObservation.types'
import { http } from '@/services/http/http.client'

const BASE = '/hospitalization-observations'

export const hospitalizationObservationApi = {
  async create(
    payload: CreateHospitalizationObservationPayload,
  ): Promise<HospitalizationObservationResponse> {
    const { data } = await http.post<HospitalizationObservationResponse>(BASE, payload)
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationObservationResponse[]> {
    const { data } = await http.get<HospitalizationObservationResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },
}

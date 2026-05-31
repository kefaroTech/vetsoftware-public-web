import { http } from '@/services/http/http.client'

export interface CreateHospitalizationObservationPayload {
  description: string
  hospitalizationId: number
}

export interface ObservationEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface HospitalizationObservationResponse {
  id: number
  description: string
  hospitalization: { id: number; date: string }
  createdBy: ObservationEmployeeSummary
  createdDate: string // ISO LocalDateTime
  enabled: boolean
}

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

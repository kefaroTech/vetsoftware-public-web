import { http } from '@/services/http/http.client'

export interface CreateHospitalizationProgressNotePayload {
  description: string
  hospitalizationId: number
}

export interface ProgressNoteEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface HospitalizationProgressNoteResponse {
  id: number
  description: string
  hospitalization: { id: number; date: string }
  createdBy: ProgressNoteEmployeeSummary
  createdDate: string // ISO LocalDateTime
  enabled: boolean
}

const BASE = '/hospitalization-progress-notes'

export const hospitalizationProgressNoteApi = {
  async create(
    payload: CreateHospitalizationProgressNotePayload,
  ): Promise<HospitalizationProgressNoteResponse> {
    const { data } = await http.post<HospitalizationProgressNoteResponse>(BASE, payload)
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationProgressNoteResponse[]> {
    const { data } = await http.get<HospitalizationProgressNoteResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },
}

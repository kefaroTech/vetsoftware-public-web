import type {
  CreateHospitalizationProgressNotePayload,
  HospitalizationProgressNoteResponse,
} from '../types/hospitalizationProgressNote.types'
import { http } from '@/services/http/http.client'

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

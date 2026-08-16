import type { LaboratoryTestFileResponse } from '../types/laboratoryTestFile.types'
import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'

export const laboratoryTestFileApi = {
  async upload(laboratoryTestId: number, file: File): Promise<LaboratoryTestFileResponse> {
    const form = new FormData()
    form.append('laboratoryTestId', String(laboratoryTestId))
    form.append('file', file)
    const { data } = await http.post<LaboratoryTestFileResponse>('/laboratory-test-files', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return data
  },

  async listByTest(laboratoryTestId: number): Promise<LaboratoryTestFileResponse[]> {
    const { data } = await http.get<LaboratoryTestFileResponse[]>(
      `/laboratory-test-files/by-laboratory-test/${laboratoryTestId}`,
    )
    return data
  },

  async download(id: number): Promise<Blob> {
    const { data } = await http.get<Blob>(`/laboratory-test-files/${id}/download`, {
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/laboratory-test-files/${id}`)
  },
}

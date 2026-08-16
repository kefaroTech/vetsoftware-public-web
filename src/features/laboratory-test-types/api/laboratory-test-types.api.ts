import type { TestTypeResponse, CreateTestTypePayload } from '../types/laboratory-test-types.types'
import { http } from '@/services/http/http.client'

export const testTypeApi = {
  async listAll(): Promise<TestTypeResponse[]> {
    const { data } = await http.get<TestTypeResponse[]>('/laboratory-test-types/available')
    return data
  },

  async create(payload: CreateTestTypePayload): Promise<TestTypeResponse> {
    const { data } = await http.post<TestTypeResponse>('/laboratory-test-types', payload)
    return data
  },
}

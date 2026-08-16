import { http } from '@/services/http/http.client'

export interface TestTypeResponse {
  id: number
  name: string
  description: string | null
  createdDate: string
}

export interface CreateTestTypePayload {
  name: string
  description: string
}

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

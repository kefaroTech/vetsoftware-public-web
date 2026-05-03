import { http } from '@/services/http/http.client'
import type { LoginEmployeeRequest, TokenResponse } from '../types'

export const authApi = {
  async loginEmployee(payload: LoginEmployeeRequest): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/login/employee', payload)
    return data
  },
}

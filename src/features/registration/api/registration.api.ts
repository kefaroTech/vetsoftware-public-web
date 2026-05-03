import { http } from '@/services/http/http.client'
import type { RegisterUserRequest, RegistrationResponse } from '../types'

export const registrationApi = {
  async register(payload: RegisterUserRequest): Promise<RegistrationResponse> {
    const { data } = await http.post<RegistrationResponse>('/register', payload)
    return data
  },
}

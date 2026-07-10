import { http } from '@/services/http/http.client'
import type { RegisterUserRequest, RegistrationResponse } from '../types'

export const registrationApi = {
  async register(payload: RegisterUserRequest): Promise<RegistrationResponse> {
    const { data } = await http.post<RegistrationResponse>('/register', payload)
    return data
  },

  // Confirma el correo con el token recibido por email (Opción B). 204 No Content si OK.
  async verifyEmail(token: string): Promise<void> {
    await http.post('/register/verify', { token })
  },
}

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

  // Opción A: sugiere un usuario de acceso disponible a partir de empresa + nombre.
  async suggestCode(companyName: string, employeeName: string): Promise<string> {
    const { data } = await http.get<{ code: string }>('/register/suggest-code', {
      params: { companyName, employeeName },
      skipGlobalLoader: true,
    })
    return data.code
  },

  // Opción A: chequeo en vivo de disponibilidad del usuario de acceso.
  async checkCodeAvailability(code: string): Promise<boolean> {
    const { data } = await http.get<{ available: boolean }>('/register/code-availability', {
      params: { code },
      skipGlobalLoader: true,
    })
    return data.available
  },
}

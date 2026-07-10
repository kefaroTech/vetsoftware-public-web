import { http } from '@/services/http/http.client'
import type { LoginEmployeeRequest, MeResponse, TokenResponse } from '../types'

export const authApi = {
  async loginEmployee(payload: LoginEmployeeRequest): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/login/employee', payload)
    return data
  },

  async me(): Promise<MeResponse> {
    const { data } = await http.get<MeResponse>('/auth/me')
    return data
  },

  async refresh(refreshToken: string): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/refresh', { refreshToken })
    return data
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },

  // Cambio de la propia contraseña (primer login forzado). Limpia mustChangePassword en el backend.
  async changePassword(newPassword: string): Promise<void> {
    await http.post('/employees/me/change-password', { newPassword })
  },
}

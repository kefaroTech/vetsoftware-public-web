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

  // Sin cuerpo: el refresh token va en la cookie HttpOnly que adjunta el navegador.
  async refresh(): Promise<TokenResponse> {
    const { data } = await http.post<TokenResponse>('/auth/refresh')
    return data
  },

  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },

  // Cambio de la propia contraseña (primer login forzado). Limpia mustChangePassword en el backend.
  async changePassword(newPassword: string): Promise<void> {
    await http.post('/employees/me/change-password', { newPassword })
  },

  // "Olvidé mi contraseña": solicita el enlace por código. El backend responde 204 SIEMPRE (anti-enumeración).
  async forgotPassword(employeeCode: string): Promise<void> {
    await http.post('/auth/forgot-password', { employeeCode })
  },

  // ¿El token del enlace de restablecimiento sigue siendo usable?
  async validateResetToken(token: string): Promise<boolean> {
    const { data } = await http.get<{ valid: boolean }>('/auth/reset-password/validate', {
      params: { token },
    })
    return data.valid
  },

  // Confirma el restablecimiento con el token del correo + la nueva contraseña.
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await http.post('/auth/reset-password', { token, newPassword })
  },

  // "Recordar mi código": envía los códigos asociados al correo. Responde 204 SIEMPRE (anti-enumeración).
  async recoverCode(email: string): Promise<void> {
    await http.post('/auth/recover-code', { email })
  },
}

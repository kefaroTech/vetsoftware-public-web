import type { CompanySettingDto } from '../types/companySetting.types'
import { http } from '@/services/http/http.client'

/**
 * Clave del ajuste que fija la duración por defecto de las citas de la empresa, en minutos.
 * Espejo literal de `CompanySettingsAppointmentDurationPolicy.KEY`.
 */
export const APPOINTMENT_DEFAULT_DURATION_KEY = 'appointment.default_duration_minutes'

export const companySettingApi = {
  /**
   * Ajustes de la empresa del usuario. `GET /company-settings` exige `company.read`: quien no
   * lo tenga recibe un 403, y por eso el store que lo consume conserva su respaldo en el
   * `catch` en vez de romper la agenda.
   *
   * Sin loader global: es una lectura de fondo que no debe velar la pantalla.
   */
  async listAll(): Promise<CompanySettingDto[]> {
    const { data } = await http.get<CompanySettingDto[]>('/company-settings', {
      skipGlobalLoader: true,
    })
    return data
  },
}

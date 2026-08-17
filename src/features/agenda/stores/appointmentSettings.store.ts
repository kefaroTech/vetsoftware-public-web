import { defineStore } from 'pinia'
import { ref } from 'vue'
import { APPOINTMENT_DEFAULT_DURATION_KEY, companySettingApi } from '../api/companySetting.api'
import {
  APPT_MAX_DURATION_MINUTES,
  DEFAULT_APPOINTMENT_DURATION_MINUTES,
} from '../types/appointment'

/**
 * Duración por defecto de las citas de la empresa (`appointment.default_duration_minutes`).
 *
 * El backend la resuelve en tres niveles —duración de la cita → ajuste de la empresa → 30
 * minutos—; el front solo necesita el segundo, porque el primero viaja en cada cita y el
 * tercero está replicado en `DEFAULT_APPOINTMENT_DURATION_MINUTES`. Sin este ajuste, el
 * aviso de solape del formulario y el rango horario de las tarjetas mentirían en cualquier
 * clínica que no trabaje con huecos de 30 minutos.
 *
 * **Falla conservando el respaldo.** `GET /company-settings` exige `company.read`, que no
 * todos los roles tienen: si la lectura falla por permiso o por red, se queda el valor
 * anterior (30 al arrancar) y la agenda funciona igual. Mismo criterio que el UVT en
 * `facturacion/stores/systemConfig.store.ts`.
 *
 * El parseo es defensivo porque el `value` es texto libre que teclea un admin: «treinta»,
 * «0» o «-15» caen al respaldo en vez de reventar el cálculo de solapes, exactamente como
 * hace `CompanySettingsAppointmentDurationPolicy`.
 */
export const useAppointmentSettingsStore = defineStore('appointmentSettings', () => {
  const defaultDurationMinutes = ref(DEFAULT_APPOINTMENT_DURATION_MINUTES)
  /** `true` cuando la lectura del backend ya se completó (con o sin la fila del ajuste). */
  const loaded = ref(false)
  let inFlight: Promise<void> | null = null

  async function fetchSetting(): Promise<void> {
    try {
      const settings = await companySettingApi.listAll()
      const raw = settings?.find((s) => s.propertyName === APPOINTMENT_DEFAULT_DURATION_KEY)?.value
      const parsed = Number(raw)
      if (Number.isInteger(parsed) && parsed > 0 && parsed <= APPT_MAX_DURATION_MINUTES) {
        defaultDurationMinutes.value = parsed
      }
      loaded.value = true
    } catch {
      // Sin permiso `company.read` o sin red: se conserva el respaldo. No bloquea la agenda.
    }
  }

  /**
   * Dedup de llamadas concurrentes; la caché solo aplica si NO se fuerza, así que al abrir la
   * pantalla o el modal se llama con `force = true` y siempre se relee.
   */
  function load(force = false): Promise<void> {
    if (inFlight) return inFlight
    if (!force && loaded.value) return Promise.resolve()
    inFlight = fetchSetting().finally(() => (inFlight = null))
    return inFlight
  }

  return { defaultDurationMinutes, loaded, load }
})

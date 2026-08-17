import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAppointmentSettingsStore } from '../stores/appointmentSettings.store'
import {
  APPT_DURATION_CHOICES,
  apptDuration,
  apptEndTime,
  apptTimeRange,
  type AppointmentResponse,
} from '../types/appointment'

/**
 * Wrapper del store con la duración por defecto de la empresa, más los formateadores que la
 * necesitan. Es la API que consumen tarjetas, chips, modal de detalle y formulario: ninguno
 * de ellos debe conocer ni el endpoint ni el respaldo de 30 minutos.
 *
 * Dispara la carga (deduplicada) al primer uso, igual que `useFeUvt`. Los consumidores que
 * "abren pantalla o modal" llaman además a `refresh()`, que sí reelee.
 */
export function useAppointmentDuration() {
  const store = useAppointmentSettingsStore()
  const { defaultDurationMinutes, loaded } = storeToRefs(store)
  void store.load()

  /** Minutos que dura de verdad una cita (los suyos, o los de la empresa). */
  function durationOf(appt: Pick<AppointmentResponse, 'durationMinutes'>): number {
    return apptDuration(appt.durationMinutes, defaultDurationMinutes.value)
  }

  /** "09:00–09:45" de una cita. */
  function rangeOf(appt: Pick<AppointmentResponse, 'startAt' | 'durationMinutes'>): string {
    return apptTimeRange(appt.startAt, appt.durationMinutes, defaultDurationMinutes.value)
  }

  /** "09:45" de una cita. */
  function endOf(appt: Pick<AppointmentResponse, 'startAt' | 'durationMinutes'>): string {
    return apptEndTime(appt.startAt, appt.durationMinutes, defaultDurationMinutes.value)
  }

  /**
   * Opciones del desplegable. `''` es «por defecto» (viaja como `null`). Si la cita que se
   * edita tiene una duración fuera del catálogo, se añade para no cambiársela sin querer.
   */
  function options(current: number | null): { value: string; label: string }[] {
    const minutes = [...APPT_DURATION_CHOICES]
    if (current != null && current > 0 && !minutes.includes(current)) minutes.push(current)
    return minutes.sort((a, b) => a - b).map((m) => ({ value: String(m), label: `${m} min` }))
  }

  return {
    defaultDurationMinutes,
    loaded,
    load: store.load,
    refresh: () => store.load(true),
    durationChoices: computed(() => APPT_DURATION_CHOICES),
    durationOf,
    rangeOf,
    endOf,
    options,
  }
}

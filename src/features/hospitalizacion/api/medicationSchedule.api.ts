import type { MedicationScheduleResponse } from '../types/medicationSchedule.types'
import { http } from '@/services/http/http.client'

const BASE = '/medication-schedules'

export const medicationScheduleApi = {
  /** Regenera (borra plan previo + crea) las tomas de una medicación. */
  async generate(hospitalizationMedicationId: number): Promise<MedicationScheduleResponse[]> {
    const { data } = await http.post<MedicationScheduleResponse[]>(
      `${BASE}/generate/${hospitalizationMedicationId}`,
    )
    return data
  },

  async listByHospitalization(hospitalizationId: number): Promise<MedicationScheduleResponse[]> {
    const { data } = await http.get<MedicationScheduleResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  /** Marca la toma como aplicada. Devuelve el plan completo de esa medicación. */
  async apply(scheduleId: number): Promise<MedicationScheduleResponse[]> {
    const { data } = await http.patch<MedicationScheduleResponse[]>(`${BASE}/${scheduleId}/apply`)
    return data
  },

  /** Reprograma la toma (mode: 'one' | 'cascade'). Devuelve el plan de esa medicación. */
  async reschedule(
    scheduleId: number,
    newDateTime: string,
    mode: 'one' | 'cascade',
  ): Promise<MedicationScheduleResponse[]> {
    const { data } = await http.patch<MedicationScheduleResponse[]>(
      `${BASE}/${scheduleId}/reschedule`,
      { newDateTime, mode },
    )
    return data
  },

  /** Soft-delete de las tomas pendientes (al suspender). Devuelve las aplicadas. */
  async suspendPending(hospitalizationMedicationId: number): Promise<MedicationScheduleResponse[]> {
    const { data } = await http.patch<MedicationScheduleResponse[]>(
      `${BASE}/by-medication/${hospitalizationMedicationId}/suspend-pending`,
    )
    return data
  },
}

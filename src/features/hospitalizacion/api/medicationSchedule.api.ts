import type {
  MedicationScheduleResponse,
  RescheduleMedicationScheduleResponse,
} from '../types/medicationSchedule.types'
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

  /**
   * Reprograma la toma (mode: 'one' | 'cascade').
   *
   * <p>Devuelve el plan de esa medicación **envuelto** junto con el desenlace de la cascada: el
   * contrato dejó de ser un array en #134. Pedir la cascada no garantiza aplicarla, y mientras la
   * respuesta fue un array la pantalla no podía distinguir «se recalcularon las siguientes» de
   * «solo se movió esta».
   *
   * <p>El `mode` viaja en minúscula a propósito: el contrato declara `"ONE" | "CASCADE"` y el
   * servidor las acepta en cualquier caja por el `@JsonFormat(ACCEPT_CASE_INSENSITIVE_VALUES)`
   * transitorio del backend. Migrar estos literales a mayúscula es el paso 3 del issue #211 y va
   * antes de que el backend retire esa red.
   */
  async reschedule(
    scheduleId: number,
    newDateTime: string,
    mode: 'one' | 'cascade',
  ): Promise<RescheduleMedicationScheduleResponse> {
    const { data } = await http.patch<RescheduleMedicationScheduleResponse>(
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

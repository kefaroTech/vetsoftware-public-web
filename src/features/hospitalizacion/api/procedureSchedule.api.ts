import { http } from '@/services/http/http.client'
import type { AppliedStatus } from './medicationSchedule.api'

export interface ProcedureScheduleEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface ProcedureScheduleResponse {
  id: number
  hospitalizationProcedure: { id: number; name: string }
  originalDateTime: string // ISO LocalDateTime 'yyyy-MM-ddTHH:mm:ss'
  currentDateTime: string
  realDateTime: string | null
  appliedStatus: AppliedStatus | null
  rescheduled: boolean | null
  createdBy: ProcedureScheduleEmployeeSummary
  createdDate: string
  enabled: boolean
}

const BASE = '/procedure-schedules'

export const procedureScheduleApi = {
  /** Regenera (borra plan previo + crea) las ejecuciones de un procedimiento. */
  async generate(
    hospitalizationProcedureId: number,
  ): Promise<ProcedureScheduleResponse[]> {
    const { data } = await http.post<ProcedureScheduleResponse[]>(
      `${BASE}/generate/${hospitalizationProcedureId}`,
    )
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<ProcedureScheduleResponse[]> {
    const { data } = await http.get<ProcedureScheduleResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  /** Marca la ejecución como aplicada. Devuelve el plan completo de ese procedimiento. */
  async apply(scheduleId: number): Promise<ProcedureScheduleResponse[]> {
    const { data } = await http.patch<ProcedureScheduleResponse[]>(
      `${BASE}/${scheduleId}/apply`,
    )
    return data
  },

  /** Reprograma la ejecución (mode: 'one' | 'cascade'). Devuelve el plan de ese procedimiento. */
  async reschedule(
    scheduleId: number,
    newDateTime: string,
    mode: 'one' | 'cascade',
  ): Promise<ProcedureScheduleResponse[]> {
    const { data } = await http.patch<ProcedureScheduleResponse[]>(
      `${BASE}/${scheduleId}/reschedule`,
      { newDateTime, mode },
    )
    return data
  },
}

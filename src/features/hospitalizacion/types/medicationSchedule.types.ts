/** Espejo de com.vetsoftware.app.medicationschedule.domain.AppliedStatus */
export type AppliedStatus = 'PENDING' | 'APPLIED' | 'SKIPPED'

export interface MedicationScheduleEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface MedicationScheduleResponse {
  id: number
  hospitalizationMedication: { id: number; name: string }
  originalDateTime: string // ISO LocalDateTime 'yyyy-MM-ddTHH:mm:ss'
  currentDateTime: string
  realDateTime: string | null
  appliedStatus: AppliedStatus | null
  rescheduled: boolean | null
  createdBy: MedicationScheduleEmployeeSummary
  createdDate: string
  enabled: boolean
}

/**
 * Espejo de com.vetsoftware.app.medicationschedule.domain.CascadeSkipReason.
 *
 * No tiene esquema propio en el contrato —springdoc lo inserta como enum en línea dentro de
 * `RescheduleMedicationScheduleResponse`—, así que no se ata en `api.contract.ts`; lo que sí se
 * ata es el tipo que lo contiene, y ahí el compilador compara la unión completa.
 */
export type CascadeSkipReason =
  'MEDICATION_ORDER_NOT_FOUND' | 'GUIDELINE_NOT_INTERVAL' | 'FREQUENCY_NOT_DISCRETE'

/**
 * Respuesta de `PATCH /medication-schedules/{id}/reschedule`.
 *
 * <p>Antes era el array de tomas a secas. Se envolvió (#134) porque pedir la cascada no garantiza
 * aplicarla —una pauta que no es de INTERVALO o una frecuencia no discreta mueven solo el pivote—
 * y el array no tenía dónde decirlo: la pantalla daba por recalculadas unas tomas que seguían
 * donde estaban.
 *
 * <p>`cascadeSkippedReason` solo viaja cuando la cascada <em>se pidió</em> y no se aplicó. Con
 * `mode` de una sola toma, o con la cascada aplicada, llega nulo.
 */
export interface RescheduleMedicationScheduleResponse {
  schedules: MedicationScheduleResponse[]
  cascadeApplied: boolean
  cascadeSkippedReason?: CascadeSkipReason
}

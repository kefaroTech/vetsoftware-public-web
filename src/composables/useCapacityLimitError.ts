import { AxiosError } from 'axios'
import { getProblemDetailCode } from '@/services/http/http.client'
import type { ProblemDetail } from '@/types/api.types'

/**
 * El backend responde 409 `CAPACITY_LIMIT_EXCEEDED` al chocar con el cupo de sedes o
 * empleados del plan y adjunta `limit` en el `ProblemDetail`. El contrato compartido
 * (`api.types.ts`, gemelo TR-02) no lo declara porque es propio de este único error de
 * negocio.
 */
interface CapacityLimitProblemDetail extends ProblemDetail {
  limit?: number
}

export function isCapacityLimitExceeded(error: unknown): boolean {
  return getProblemDetailCode(error) === 'CAPACITY_LIMIT_EXCEEDED'
}

export function capacityLimitMessage(error: unknown, noun: string): string {
  const data =
    error instanceof AxiosError
      ? (error.response?.data as CapacityLimitProblemDetail | undefined)
      : undefined
  const cupo = data?.limit != null ? ` (${data.limit})` : ''
  return `Ya usas todo el cupo de ${noun} que incluye tu plan${cupo}. Amplía el cupo desde Mi suscripción.`
}

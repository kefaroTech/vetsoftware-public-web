import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'
import type {
  CashSessionView,
  CloseCashSessionRequest,
  OpenCashSessionRequest,
  PageResponse,
  RegisterCashMovementRequest,
} from '../types/caja'

// Caja / arqueo (backend: /cash-sessions). La sede va como contexto multi-sucursal (body en escrituras,
// query en lecturas). El backend la acota por el alcance del empleado.

export interface CashHistoryParams {
  branchId?: number | null
  employeeId?: number
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export const cashSessionApi = {
  async open(payload: OpenCashSessionRequest): Promise<CashSessionView> {
    const { data } = await http.post<CashSessionView>(
      '/cash-sessions/open',
      withBranchBody(payload),
    )
    return data
  },

  async registerMovement(
    sessionId: number,
    payload: RegisterCashMovementRequest,
  ): Promise<CashSessionView> {
    const { data } = await http.post<CashSessionView>(
      `/cash-sessions/${sessionId}/movements`,
      payload,
    )
    return data
  },

  async close(sessionId: number, payload: CloseCashSessionRequest): Promise<CashSessionView> {
    const { data } = await http.post<CashSessionView>(`/cash-sessions/${sessionId}/close`, payload)
    return data
  },

  /** Sesión OPEN de la sede seleccionada, o null si no hay caja abierta. */
  async current(signal?: AbortSignal): Promise<CashSessionView | null> {
    const { data } = await http.get<CashSessionView | ''>('/cash-sessions/current', { signal })
    return data ? (data as CashSessionView) : null
  },

  async getById(id: number): Promise<CashSessionView> {
    const { data } = await http.get<CashSessionView>(`/cash-sessions/${id}`)
    return data
  },

  /** Cajas OPEN visibles según la compañía y las sedes autorizadas del usuario. */
  async listOpen(signal?: AbortSignal): Promise<CashSessionView[]> {
    const { data } = await http.get<CashSessionView[]>('/cash-sessions/open', { signal })
    return data
  },

  async history(
    params: CashHistoryParams = {},
    signal?: AbortSignal,
  ): Promise<PageResponse<CashSessionView>> {
    const requestParams = Object.prototype.hasOwnProperty.call(params, 'branchId')
      ? params
      : withBranchParam({ ...params })
    const { data } = await http.get<PageResponse<CashSessionView>>('/cash-sessions', {
      params: requestParams,
      signal,
    })
    return data
  },

  /** Descarga el arqueo (CSV/PDF) disparando la descarga en el navegador. */
  async exportArqueo(id: number, format: 'csv' | 'pdf'): Promise<void> {
    const { data } = await http.get<Blob>(`/cash-sessions/${id}/arqueo/export`, {
      params: { format },
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = `arqueo_caja_${id}.${format}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}

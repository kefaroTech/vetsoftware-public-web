import type { PageResponse } from '@/types/pagination'
import { http } from '@/services/http/http.client'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'
import type {
  OpenAccountResponse,
  OpenAccountSearchCriteria,
  OpenAccountStatus,
  OpenAccountsSummary,
} from '../types/cuentas'

/**
 * Tope de página que acepta el backend (BE-06). Pedir más se recorta en servidor, así que este
 * valor es el máximo real, no una preferencia.
 */
const MAX_PAGE_SIZE = 200

export const openAccountApi = {
  /**
   * BE-06: `GET /open-accounts` devuelve `PageResponse`, igual que `/search`. Este es el contrato
   * real del endpoint y el que debe usar cualquier pantalla nueva.
   */
  async listPage(
    page = 0,
    pageSize = 20,
    signal?: AbortSignal,
  ): Promise<PageResponse<OpenAccountResponse>> {
    const { data } = await http.get<PageResponse<OpenAccountResponse>>('/open-accounts', {
      params: withBranchParam({ page, pageSize }),
      signal,
    })
    return data
  },

  /**
   * Búsqueda servida: pestaña (`statuses`), buscador (`q`) y paginación viajan al backend.
   *
   * <p>BE-06: antes la pantalla pedía el tope de 200 filas y filtraba en cliente. Con la lista
   * paginada ese filtro solo vería lo ya cargado, así que los criterios se resuelven en SQL.
   * `status` va repetido (`status=CLOSE&status=CANCEL`), que es como Spring lo mapea a lista.
   */
  async search(
    criteria: OpenAccountSearchCriteria,
    signal?: AbortSignal,
  ): Promise<PageResponse<OpenAccountResponse>> {
    const params: Record<string, string | number | boolean | string[]> = {
      page: criteria.page ?? 0,
      pageSize: Math.min(criteria.pageSize ?? 20, MAX_PAGE_SIZE),
    }
    if (criteria.ownerId != null) params.ownerId = criteria.ownerId
    if (criteria.enabled != null) params.enabled = criteria.enabled
    if (criteria.statuses && criteria.statuses.length > 0) params.status = criteria.statuses
    if (criteria.q && criteria.q.trim()) params.q = criteria.q.trim()
    const { data } = await http.get<PageResponse<OpenAccountResponse>>('/open-accounts/search', {
      params: withBranchParam(params),
      signal,
    })
    return data
  },

  /** Contadores de las pestañas y saldo pendiente acumulado de la empresa/sede (BE-06). */
  async summary(): Promise<OpenAccountsSummary> {
    const { data } = await http.get<OpenAccountsSummary>('/open-accounts/summary', {
      params: withBranchParam({}),
    })
    return data
  },

  async findById(id: number): Promise<OpenAccountResponse> {
    const { data } = await http.get<OpenAccountResponse>(`/open-accounts/${id}`)
    return data
  },

  async create(ownerId: number): Promise<OpenAccountResponse> {
    const { data } = await http.post<OpenAccountResponse>(
      '/open-accounts',
      withBranchBody({ ownerId }),
    )
    return data
  },

  async changeStatus(
    id: number,
    status: OpenAccountStatus,
    reason?: string,
    // Solo relevantes al CERRAR (CLOSE): disparan la auto-emisión del documento DIAN.
    documentType?: 'FE_VENTA' | 'DOC_EQUIV_POS',
    finalConsumer?: boolean,
    // Versión esperada de la cuenta (opt-in): detección temprana de conflicto de concurrencia (409).
    expectedVersion?: number,
  ): Promise<OpenAccountResponse> {
    const { data } = await http.patch<OpenAccountResponse>(`/open-accounts/${id}/status`, {
      status,
      reason,
      documentType,
      finalConsumer,
      expectedVersion,
    })
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/open-accounts/${id}`)
  },
}

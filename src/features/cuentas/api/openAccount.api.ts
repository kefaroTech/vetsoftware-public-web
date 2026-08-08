import { http } from '@/services/http/http.client'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'
import type {
  OpenAccountResponse,
  OpenAccountSearchCriteria,
  OpenAccountStatus,
  PageResponse,
} from '../types/cuentas'

/** Tope de pagina que acepta el backend. */
const MAX_ACCOUNTS_PAGE_SIZE = 200

export const openAccountApi = {
  async listAll(): Promise<OpenAccountResponse[]> {
    // BE-06: /open-accounts pasó a devolver PageResponse. Esta pantalla aún no acumula
    // páginas, así que pide el tope que admite el servidor para no ocultar cuentas en
    // silencio. Pendiente: pasar la tabla a paginación servida (ver PR del backend).
    const { data } = await http.get<PageResponse<OpenAccountResponse>>('/open-accounts', {
      params: withBranchParam({ pageSize: MAX_ACCOUNTS_PAGE_SIZE }),
    })
    return data.content
  },

  async search(criteria: OpenAccountSearchCriteria): Promise<PageResponse<OpenAccountResponse>> {
    const params: Record<string, string | number | boolean> = {
      page: criteria.page ?? 0,
      pageSize: criteria.pageSize ?? 20,
    }
    if (criteria.ownerId != null) params.ownerId = criteria.ownerId
    if (criteria.enabled != null) params.enabled = criteria.enabled
    const { data } = await http.get<PageResponse<OpenAccountResponse>>('/open-accounts/search', {
      params: withBranchParam(params),
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

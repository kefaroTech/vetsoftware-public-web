import { http } from '@/services/http/http.client'
import { withBranchBody, withBranchParam } from '@/features/branches/api/branchContext'
import type {
  OpenAccountResponse,
  OpenAccountSearchCriteria,
  OpenAccountStatus,
  PageResponse,
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
   * Atajo para las pantallas que aún trabajan sobre la lista completa: pide el tope del servidor
   * y devuelve solo el contenido.
   *
   * <p>Se mantiene porque el store de cuentas y `FeEmitModal` filtran y agrupan sobre el array
   * entero; dejarles la página por defecto de 20 ocultaría cuentas abiertas en silencio. Cuando
   * esas pantallas pasen a paginación servida, esto desaparece y usan `listPage`.
   */
  async listAll(): Promise<OpenAccountResponse[]> {
    const { content } = await this.listPage(0, MAX_PAGE_SIZE)
    return content
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

import { http, DIAN_TIMEOUT_MS } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import { withBranchParam } from '@/features/branches/api/branchContext'
import type {
  CreditNoteReason,
  DebitNoteReason,
  DianStatus,
  ElectronicDocumentResponse,
  ElectronicDocumentType,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

/** Tope de pagina que acepta el backend. */
const MAX_DOCUMENTS_PAGE_SIZE = 200

export const electronicDocumentApi = {
  /**
   * Página de documentos con los filtros de la pantalla resueltos en el servidor (BE-06):
   * `documentType` y `dianStatus` se aplicaban en cliente sobre la lista completa, cosa que
   * con paginación solo vería lo ya cargado.
   */
  async listPage(
    filters: { documentType?: ElectronicDocumentType | ''; dianStatus?: DianStatus | '' },
    page = 0,
    pageSize = 20,
    signal?: AbortSignal,
  ): Promise<PageResponse<ElectronicDocumentResponse>> {
    const params: Record<string, string | number> = {
      page,
      pageSize: Math.min(pageSize, MAX_DOCUMENTS_PAGE_SIZE),
    }
    if (filters.documentType) params.documentType = filters.documentType
    if (filters.dianStatus) params.dianStatus = filters.dianStatus
    const { data } = await http.get<PageResponse<ElectronicDocumentResponse>>(
      '/electronic-documents',
      { params: withBranchParam(params), signal },
    )
    return data
  },

  async findById(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.get<ElectronicDocumentResponse>(`/electronic-documents/${id}`)
    return data
  },

  /** Documento emitido al cerrar una cuenta. Devuelve null si la cuenta no generó documento (404). */
  async findByAccount(openAccountId: number): Promise<ElectronicDocumentResponse | null> {
    try {
      const { data } = await http.get<ElectronicDocumentResponse>(
        `/electronic-documents/by-account/${openAccountId}`,
      )
      return data
    } catch (e) {
      if (
        !!e &&
        typeof e === 'object' &&
        'response' in e &&
        (e as { response?: { status?: number } }).response?.status === 404
      ) {
        return null
      }
      throw e
    }
  },

  // Las cinco operaciones que siguen transmiten a la DIAN dentro de la propia
  // petición: el backend habla con el proveedor con hasta 75 s de presupuesto
  // (15 s de connect + 60 s de read en DianHttpConfig). Con el timeout por
  // defecto el navegador abortaría a los 20 s mientras el servidor sigue
  // emitiendo, y el usuario se quedaría sin el resultado de un documento que ya
  // consumió consecutivo — sin saber si reintentar o no.

  async emit(payload: EmitElectronicDocumentRequest): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      '/electronic-documents/emit',
      payload,
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },

  async transmit(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/transmit`,
      undefined,
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },

  async convertToInvoice(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/convert-to-invoice`,
      undefined,
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },

  async creditNote(id: number, reason: CreditNoteReason): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/credit-note`,
      { reason },
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },

  async debitNote(id: number, reason: DebitNoteReason): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/debit-note`,
      { reason },
      { timeout: DIAN_TIMEOUT_MS },
    )
    return data
  },
}

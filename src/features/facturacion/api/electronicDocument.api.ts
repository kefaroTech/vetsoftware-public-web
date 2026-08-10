import { http, DIAN_TIMEOUT_MS } from '@/services/http/http.client'
import type { PageResponse } from '@/types/pagination'
import { withBranchParam } from '@/features/branches/api/branchContext'
import type {
  CreditNoteReason,
  DebitNoteReason,
  ElectronicDocumentResponse,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

/** Tope de pagina que acepta el backend. */
const MAX_DOCUMENTS_PAGE_SIZE = 200

export const electronicDocumentApi = {
  async listAll(): Promise<ElectronicDocumentResponse[]> {
    // BE-06: /electronic-documents pasó a devolver PageResponse. Esta pantalla aún no
    // acumula páginas, así que pide el tope que admite el servidor para no ocultar
    // documentos fiscales en silencio. Pendiente: pasarla a paginación servida.
    const { data } = await http.get<PageResponse<ElectronicDocumentResponse>>(
      '/electronic-documents',
      { params: withBranchParam({ pageSize: MAX_DOCUMENTS_PAGE_SIZE }) },
    )
    return data.content
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

import { http } from '@/services/http/http.client'
import { withBranchParam } from '@/features/branches/api/branchContext'
import type {
  CreditNoteReason,
  DebitNoteReason,
  ElectronicDocumentResponse,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

export const electronicDocumentApi = {
  async listAll(): Promise<ElectronicDocumentResponse[]> {
    const { data } = await http.get<ElectronicDocumentResponse[]>('/electronic-documents', {
      params: withBranchParam({}),
    })
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

  async emit(payload: EmitElectronicDocumentRequest): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      '/electronic-documents/emit',
      payload,
    )
    return data
  },

  async transmit(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/transmit`,
    )
    return data
  },

  async convertToInvoice(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/convert-to-invoice`,
    )
    return data
  },

  async creditNote(id: number, reason: CreditNoteReason): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/credit-note`,
      { reason },
    )
    return data
  },

  async debitNote(id: number, reason: DebitNoteReason): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(
      `/electronic-documents/${id}/debit-note`,
      { reason },
    )
    return data
  },
}

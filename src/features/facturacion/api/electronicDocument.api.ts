import { http } from '@/services/http/http.client'
import type {
  CreditNoteReason,
  DebitNoteReason,
  ElectronicDocumentResponse,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

export const electronicDocumentApi = {
  async listAll(): Promise<ElectronicDocumentResponse[]> {
    const { data } = await http.get<ElectronicDocumentResponse[]>('/electronic-documents')
    return data
  },

  async findById(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.get<ElectronicDocumentResponse>(`/electronic-documents/${id}`)
    return data
  },

  async emit(payload: EmitElectronicDocumentRequest): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>('/electronic-documents/emit', payload)
    return data
  },

  async transmit(id: number): Promise<ElectronicDocumentResponse> {
    const { data } = await http.post<ElectronicDocumentResponse>(`/electronic-documents/${id}/transmit`)
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

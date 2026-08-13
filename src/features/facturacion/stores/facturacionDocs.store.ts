import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { electronicDocumentApi } from '../api/electronicDocument.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { PageResponse } from '@/types/pagination'
import type {
  CreditNoteReason,
  DebitNoteReason,
  DianStatus,
  ElectronicDocumentResponse,
  ElectronicDocumentType,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

/**
 * Store de documentos electrónicos (DIAN). La emisión real es automática al cobrar
 * la cuenta (backend, evento post-commit); este store cubre la lectura, la emisión
 * manual (re-emitir / casos especiales) y las correcciones (notas, re-transmisión).
 */
export const useFacturacionDocsStore = defineStore('facturacionDocs', () => {
  /**
   * Documentos que el usuario ya tocó (emitidos, transmitidos, refrescados). BE-06: dejó de ser
   * "la lista" —de eso se encarga la paginación servida de la pantalla— y quedó como caché de
   * la versión más fresca de cada documento, que es lo que lee el detalle abierto.
   */
  const documents = ref<ElectronicDocumentResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  function upsert(doc: ElectronicDocumentResponse): void {
    const idx = documents.value.findIndex((d) => d.id === doc.id)
    if (idx >= 0) documents.value.splice(idx, 1, doc)
    else documents.value = [doc, ...documents.value]
  }

  /**
   * Una página de documentos con los filtros de la pantalla (tipo y estado DIAN) resueltos en
   * el servidor. Filtrarlos en cliente sobre una lista paginada ocultaría documentos fiscales.
   */
  function searchPage(
    filters: { documentType?: ElectronicDocumentType | ''; dianStatus?: DianStatus | '' },
    page: number,
    pageSize: number,
    signal?: AbortSignal,
  ): Promise<PageResponse<ElectronicDocumentResponse>> {
    return electronicDocumentApi.listPage(filters, page, pageSize, signal)
  }

  // Multi-sucursal: al cambiar de sede la caché deja de valer. La lista la recarga la pantalla,
  // que es quien tiene el estado de la paginación.
  watch(
    () => useBranchStore().selectedBranchId,
    () => {
      documents.value = []
    },
  )

  /** Refresca un documento desde el backend (tras transmitir/validar async). */
  async function refresh(id: number): Promise<ElectronicDocumentResponse> {
    const fresh = await electronicDocumentApi.findById(id)
    upsert(fresh)
    return fresh
  }

  async function emit(payload: EmitElectronicDocumentRequest): Promise<ElectronicDocumentResponse> {
    const created = await electronicDocumentApi.emit(payload)
    upsert(created)
    return created
  }

  async function transmit(id: number): Promise<ElectronicDocumentResponse> {
    const updated = await electronicDocumentApi.transmit(id)
    upsert(updated)
    return updated
  }

  async function convertToInvoice(id: number): Promise<ElectronicDocumentResponse> {
    const invoice = await electronicDocumentApi.convertToInvoice(id)
    upsert(invoice)
    return invoice
  }

  async function creditNote(
    id: number,
    reason: CreditNoteReason,
  ): Promise<ElectronicDocumentResponse> {
    const note = await electronicDocumentApi.creditNote(id, reason)
    upsert(note)
    // El original puede quedar reversed=true tras validar la nota; refrescarlo.
    void refresh(id).catch(() => undefined)
    return note
  }

  async function debitNote(
    id: number,
    reason: DebitNoteReason,
  ): Promise<ElectronicDocumentResponse> {
    const note = await electronicDocumentApi.debitNote(id, reason)
    upsert(note)
    return note
  }

  return {
    documents,
    loading,
    error,
    searchPage,
    refresh,
    emit,
    transmit,
    convertToInvoice,
    creditNote,
    debitNote,
  }
})

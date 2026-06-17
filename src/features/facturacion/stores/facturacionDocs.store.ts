import { defineStore } from 'pinia'
import { ref } from 'vue'
import { electronicDocumentApi } from '../api/electronicDocument.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type {
  CreditNoteReason,
  DebitNoteReason,
  ElectronicDocumentResponse,
  EmitElectronicDocumentRequest,
} from '../types/facturacion'

/**
 * Store de documentos electrónicos (DIAN). La emisión real es automática al cobrar
 * la cuenta (backend, evento post-commit); este store cubre la lectura, la emisión
 * manual (re-emitir / casos especiales) y las correcciones (notas, re-transmisión).
 */
export const useFacturacionDocsStore = defineStore('facturacionDocs', () => {
  const documents = ref<ElectronicDocumentResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loadedOnce = false

  function upsert(doc: ElectronicDocumentResponse): void {
    const idx = documents.value.findIndex((d) => d.id === doc.id)
    if (idx >= 0) documents.value.splice(idx, 1, doc)
    else documents.value = [doc, ...documents.value]
  }

  async function loadAll(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      documents.value = await electronicDocumentApi.listAll()
      loadedOnce = true
    } catch (e) {
      error.value = getProblemDetailMessage(e, 'No se pudieron cargar los documentos')
    } finally {
      loading.value = false
    }
  }

  function ensureLoaded(): Promise<void> {
    return loadedOnce ? Promise.resolve() : loadAll()
  }

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

  async function creditNote(id: number, reason: CreditNoteReason): Promise<ElectronicDocumentResponse> {
    const note = await electronicDocumentApi.creditNote(id, reason)
    upsert(note)
    // El original puede quedar reversed=true tras validar la nota; refrescarlo.
    void refresh(id).catch(() => {})
    return note
  }

  async function debitNote(id: number, reason: DebitNoteReason): Promise<ElectronicDocumentResponse> {
    const note = await electronicDocumentApi.debitNote(id, reason)
    upsert(note)
    return note
  }

  return {
    documents,
    loading,
    error,
    ensureLoaded,
    loadAll,
    refresh,
    emit,
    transmit,
    convertToInvoice,
    creditNote,
    debitNote,
  }
})

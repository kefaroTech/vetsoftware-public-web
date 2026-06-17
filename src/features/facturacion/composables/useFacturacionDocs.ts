import { storeToRefs } from 'pinia'
import { useFacturacionDocsStore } from '../stores/facturacionDocs.store'

/** Wrapper estable del store de documentos (ver CLAUDE.md: store + composable). */
export function useFacturacionDocs() {
  const store = useFacturacionDocsStore()
  const { documents, loading, error } = storeToRefs(store)
  return {
    documents,
    loading,
    error,
    ensureLoaded: store.ensureLoaded,
    loadAll: store.loadAll,
    refresh: store.refresh,
    emit: store.emit,
    transmit: store.transmit,
    convertToInvoice: store.convertToInvoice,
    creditNote: store.creditNote,
    debitNote: store.debitNote,
  }
}

import { storeToRefs } from 'pinia'
import { useSupplierInvoicesStore } from '../stores/supplierInvoices.store'

export function useSupplierInvoices() {
  const store = useSupplierInvoicesStore()
  const { items, total, loading, error, aging, agingLoading } = storeToRefs(store)
  return {
    items,
    total,
    loading,
    error,
    aging,
    agingLoading,
    search: store.search,
    loadAging: store.loadAging,
    create: store.create,
    update: store.update,
    registerPayment: store.registerPayment,
    cancel: store.cancel,
    remove: store.remove,
  }
}

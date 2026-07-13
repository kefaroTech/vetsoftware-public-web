import { storeToRefs } from 'pinia'
import { useSuppliersStore } from '../stores/suppliers.store'

export function useSuppliers() {
  const store = useSuppliersStore()
  const { items, total, loading, error, all } = storeToRefs(store)
  return {
    items,
    total,
    loading,
    error,
    all,
    search: store.search,
    loadAll: store.loadAll,
    create: store.create,
    update: store.update,
    remove: store.remove,
  }
}

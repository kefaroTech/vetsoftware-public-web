import { storeToRefs } from 'pinia'
import { useOwnersStore } from '../stores/owners.store'

export function useOwners() {
  const store = useOwnersStore()
  const { owners, loading, error, query, page, pageSize, totalElements, totalPages } =
    storeToRefs(store)
  return {
    owners,
    loading,
    error,
    query,
    page,
    pageSize,
    totalElements,
    totalPages,
    search: store.search,
    setQuery: store.setQuery,
    setPage: store.setPage,
    refresh: store.refresh,
    reset: store.reset,
    create: store.create,
    update: store.update,
    remove: store.remove,
  }
}

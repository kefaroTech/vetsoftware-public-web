import { storeToRefs } from 'pinia'
import { useEmployeesStore } from '../stores/employees.store'

export function useEmployees() {
  const store = useEmployeesStore()
  const { employees, loading, error, query, page, pageSize, totalElements, totalPages } =
    storeToRefs(store)
  return {
    employees,
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
    deactivate: store.deactivate,
    reactivate: store.reactivate,
    resendInvitation: store.resendInvitation,
  }
}

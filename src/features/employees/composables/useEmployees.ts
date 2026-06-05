import { storeToRefs } from 'pinia'
import { useEmployeesStore } from '../stores/employees.store'

export function useEmployees() {
  const store = useEmployeesStore()
  const { employees, loading, error } = storeToRefs(store)
  return {
    employees,
    loading,
    error,
    fetchAll: store.fetchAll,
    create: store.create,
    update: store.update,
    deactivate: store.deactivate,
    reactivate: store.reactivate,
  }
}

import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRolesStore } from '../stores/roles.store'

export function useRoles() {
  const store = useRolesStore()
  const { list, loading, error } = storeToRefs(store)

  onMounted(() => {
    store.refresh()
  })

  return {
    list,
    loading,
    error,
    isActive: store.isActive,
    setActive: store.setActive,
    refresh: store.refresh,
    forceRefresh: store.forceRefresh,
    createWithPermissions: store.createWithPermissions,
    updateNameAndPermissions: store.updateNameAndPermissions,
    remove: store.remove,
  }
}

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { usePermissionsCatalogStore } from '../stores/permissionsCatalog.store'

export function usePermissionsCatalog() {
  const store = usePermissionsCatalogStore()
  const { list, bySubModule, byId } = storeToRefs(store)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await store.load()
    } catch {
      error.value = 'No se pudo cargar el catálogo de permisos.'
    } finally {
      loading.value = false
    }
  }

  async function forceRefresh() {
    await refresh()
  }

  onMounted(() => {
    refresh()
  })

  return { list, bySubModule, byId, loading, error, refresh, forceRefresh }
}

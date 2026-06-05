import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useModulesCatalogStore } from '../stores/modulesCatalog.store'

export function useModulesCatalog() {
  const store = useModulesCatalogStore()
  const { list, byId } = storeToRefs(store)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await store.load()
    } catch {
      error.value = 'No se pudo cargar el catálogo de módulos.'
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

  return { list, byId, loading, error, refresh, forceRefresh }
}

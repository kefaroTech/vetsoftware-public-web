import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSubModulesCatalogStore } from '../stores/subModulesCatalog.store'

export function useSubModulesCatalog() {
  const store = useSubModulesCatalogStore()
  const { list, byId, byModule } = storeToRefs(store)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await store.load()
    } catch {
      error.value = 'No se pudo cargar el catálogo de sub-módulos.'
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

  return { list, byId, byModule, loading, error, refresh, forceRefresh }
}

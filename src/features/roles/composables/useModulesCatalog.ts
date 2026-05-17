import { computed, onMounted, ref } from 'vue'
import { modulesApi } from '../api/modules.api'
import type { ModuleResponse } from '../types'

const cache = ref<ModuleResponse[]>([])
let inFlight: Promise<ModuleResponse[]> | null = null

async function load(): Promise<ModuleResponse[]> {
  if (inFlight) return inFlight
  inFlight = modulesApi
    .listAll()
    .then((list) => {
      cache.value = list
      inFlight = null
      return list
    })
    .catch((e) => {
      inFlight = null
      throw e
    })
  return inFlight
}

const byId = computed<Map<number, ModuleResponse>>(() => {
  const map = new Map<number, ModuleResponse>()
  for (const m of cache.value) map.set(m.id, m)
  return map
})

export function useModulesCatalog() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await load()
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

  return { list: cache, byId, loading, error, refresh, forceRefresh }
}

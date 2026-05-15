import { computed, onMounted, ref } from 'vue'
import { subModulesApi } from '../api/subModules.api'
import type { SubModuleResponse } from '../types'

const cache = ref<SubModuleResponse[]>([])
let loaded = false
let inFlight: Promise<SubModuleResponse[]> | null = null

async function load(): Promise<SubModuleResponse[]> {
  if (loaded) return cache.value
  if (!inFlight) {
    inFlight = subModulesApi
      .listAll()
      .then((list) => {
        cache.value = list
        loaded = true
        return list
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
  }
  return inFlight
}

const byId = computed<Map<number, SubModuleResponse>>(() => {
  const map = new Map<number, SubModuleResponse>()
  for (const s of cache.value) map.set(s.id, s)
  return map
})

const byModule = computed<Map<number, SubModuleResponse[]>>(() => {
  const map = new Map<number, SubModuleResponse[]>()
  for (const s of cache.value) {
    const bucket = map.get(s.module.id)
    if (bucket) bucket.push(s)
    else map.set(s.module.id, [s])
  }
  return map
})

export function useSubModulesCatalog() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch {
      error.value = 'No se pudo cargar el catálogo de sub-módulos.'
    } finally {
      loading.value = false
    }
  }

  async function forceRefresh() {
    loaded = false
    inFlight = null
    await refresh()
  }

  onMounted(() => {
    if (!loaded) refresh()
  })

  return { list: cache, byId, byModule, loading, error, refresh, forceRefresh }
}

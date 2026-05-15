import { computed, onMounted, ref } from 'vue'
import { permissionsApi } from '../api/permissions.api'
import type { PermissionResponse } from '../types'

const cache = ref<PermissionResponse[]>([])
let loaded = false
let inFlight: Promise<PermissionResponse[]> | null = null

async function load(): Promise<PermissionResponse[]> {
  if (loaded) return cache.value
  if (!inFlight) {
    inFlight = permissionsApi
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

const bySubModule = computed<Map<number, PermissionResponse[]>>(() => {
  const map = new Map<number, PermissionResponse[]>()
  for (const p of cache.value) {
    const bucket = map.get(p.subModule.id)
    if (bucket) bucket.push(p)
    else map.set(p.subModule.id, [p])
  }
  return map
})

const byId = computed<Map<number, PermissionResponse>>(() => {
  const map = new Map<number, PermissionResponse>()
  for (const p of cache.value) map.set(p.id, p)
  return map
})

export function usePermissionsCatalog() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch {
      error.value = 'No se pudo cargar el catálogo de permisos.'
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

  return { list: cache, bySubModule, byId, loading, error, refresh, forceRefresh }
}

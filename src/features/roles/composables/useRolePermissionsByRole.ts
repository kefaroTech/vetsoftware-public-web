import { computed, onMounted, ref } from 'vue'
import { rolePermissionsApi } from '../api/rolePermissions.api'
import type { RolePermissionResponse } from '../types'

const cache = ref<RolePermissionResponse[]>([])
let loaded = false
let inFlight: Promise<RolePermissionResponse[]> | null = null

async function load(): Promise<RolePermissionResponse[]> {
  if (loaded) return cache.value
  if (!inFlight) {
    inFlight = rolePermissionsApi
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

const byRoleId = computed<Map<number, RolePermissionResponse[]>>(() => {
  const map = new Map<number, RolePermissionResponse[]>()
  for (const rp of cache.value) {
    const bucket = map.get(rp.role.id)
    if (bucket) bucket.push(rp)
    else map.set(rp.role.id, [rp])
  }
  return map
})

export function useRolePermissionsByRole() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  function permissionIdsOf(roleId: number): number[] {
    return (byRoleId.value.get(roleId) ?? []).map((rp) => rp.permission.id)
  }

  function permissionIdsSetOf(roleId: number): Set<number> {
    return new Set(permissionIdsOf(roleId))
  }

  function rolePermissionEntryOf(
    roleId: number,
    permissionId: number,
  ): RolePermissionResponse | undefined {
    return (byRoleId.value.get(roleId) ?? []).find(
      (rp) => rp.permission.id === permissionId,
    )
  }

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch {
      error.value = 'No se pudieron cargar los permisos por rol.'
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

  return {
    list: cache,
    byRoleId,
    loading,
    error,
    permissionIdsOf,
    permissionIdsSetOf,
    rolePermissionEntryOf,
    refresh,
    forceRefresh,
  }
}

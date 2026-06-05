import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { permissionsApi } from '../api/permissions.api'
import type { PermissionResponse } from '../types'

export const usePermissionsCatalogStore = defineStore('permissionsCatalog', () => {
  const list = ref<PermissionResponse[]>([])
  let inFlight: Promise<PermissionResponse[]> | null = null

  const bySubModule = computed<Map<number, PermissionResponse[]>>(() => {
    const map = new Map<number, PermissionResponse[]>()
    for (const p of list.value) {
      const bucket = map.get(p.subModule.id)
      if (bucket) bucket.push(p)
      else map.set(p.subModule.id, [p])
    }
    return map
  })

  const byId = computed<Map<number, PermissionResponse>>(() => {
    const map = new Map<number, PermissionResponse>()
    for (const p of list.value) map.set(p.id, p)
    return map
  })

  async function load(): Promise<PermissionResponse[]> {
    if (inFlight) return inFlight
    inFlight = permissionsApi
      .listByCompany()
      .then((data) => {
        list.value = data
        inFlight = null
        return data
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
    return inFlight
  }

  return { list, bySubModule, byId, load }
})

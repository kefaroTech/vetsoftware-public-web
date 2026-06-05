import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { modulesApi } from '../api/modules.api'
import type { ModuleResponse } from '../types'

export const useModulesCatalogStore = defineStore('modulesCatalog', () => {
  const list = ref<ModuleResponse[]>([])
  let inFlight: Promise<ModuleResponse[]> | null = null

  const byId = computed<Map<number, ModuleResponse>>(() => {
    const map = new Map<number, ModuleResponse>()
    for (const m of list.value) map.set(m.id, m)
    return map
  })

  async function load(): Promise<ModuleResponse[]> {
    if (inFlight) return inFlight
    inFlight = modulesApi
      .listAll()
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

  return { list, byId, load }
})

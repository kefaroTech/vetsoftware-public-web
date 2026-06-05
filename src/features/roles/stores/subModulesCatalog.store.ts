import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { subModulesApi } from '../api/subModules.api'
import type { SubModuleResponse } from '../types'

export const useSubModulesCatalogStore = defineStore('subModulesCatalog', () => {
  const list = ref<SubModuleResponse[]>([])
  let inFlight: Promise<SubModuleResponse[]> | null = null

  const byId = computed<Map<number, SubModuleResponse>>(() => {
    const map = new Map<number, SubModuleResponse>()
    for (const s of list.value) map.set(s.id, s)
    return map
  })

  const byModule = computed<Map<number, SubModuleResponse[]>>(() => {
    const map = new Map<number, SubModuleResponse[]>()
    for (const s of list.value) {
      const bucket = map.get(s.module.id)
      if (bucket) bucket.push(s)
      else map.set(s.module.id, [s])
    }
    return map
  })

  async function load(): Promise<SubModuleResponse[]> {
    if (inFlight) return inFlight
    inFlight = subModulesApi
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

  return { list, byId, byModule, load }
})

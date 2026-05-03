import { ref, watch, type Ref } from 'vue'
import axios from 'axios'
import { ownerApi, type OwnerResponse } from '../api/owner.api'
import { mapOwnerResponse } from '../api/owner.mapper'
import type { Owner } from '@/types/domain'

export function useOwnerSearch(query: Ref<string>, debounceMs = 300) {
  const results = ref<Owner[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null
  let inflight: AbortController | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function run(q: string) {
    inflight?.abort()
    if (!q.trim()) {
      results.value = []
      loading.value = false
      error.value = null
      return
    }
    const ctrl = new AbortController()
    inflight = ctrl
    loading.value = true
    error.value = null
    try {
      const data = await ownerApi.search(q.trim())
      if (ctrl.signal.aborted) return
      results.value = data.map(mapOwnerResponse)
    } catch (e: unknown) {
      if (axios.isCancel(e) || ctrl.signal.aborted) return
      results.value = []
      error.value = 'No se pudo realizar la búsqueda'
    } finally {
      if (!ctrl.signal.aborted) loading.value = false
    }
  }

  watch(
    query,
    (q) => {
      clearTimer()
      timer = setTimeout(() => run(q), debounceMs)
    },
    { immediate: false },
  )

  function reset() {
    clearTimer()
    inflight?.abort()
    results.value = []
    loading.value = false
    error.value = null
  }

  return { results, loading, error, reset }
}

export type { OwnerResponse }

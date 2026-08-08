import { ref, watch, type Ref } from 'vue'
import axios from 'axios'
import { ownerApi, type OwnerResponse } from '../api/owner.api'
import { mapOwnerResponse } from '../api/owner.mapper'
import type { Owner } from '@/types/domain'

/**
 * Búsqueda de propietarios con scroll infinito.
 *
 * BE-06: `/owners/search` devolvía todas las coincidencias de golpe. Ahora llegan por páginas y se
 * acumulan al llegar al final del scroll. El debounce sigue igual, y cada término nuevo reinicia
 * la paginación a la página 0 — si no, la segunda página de una búsqueda vieja se colaría entre
 * los resultados de la nueva.
 */
export function useOwnerSearch(query: Ref<string>, debounceMs = 300, pageSize = 20) {
  const results = ref<Owner[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(false)
  const totalElements = ref(0)

  let timer: ReturnType<typeof setTimeout> | null = null
  let inflight: AbortController | null = null
  let currentTerm = ''
  let nextPage = 0

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function clearResults() {
    results.value = []
    hasMore.value = false
    totalElements.value = 0
    nextPage = 0
  }

  async function fetchPage(term: string, page: number, append: boolean) {
    inflight?.abort()
    const ctrl = new AbortController()
    inflight = ctrl
    loading.value = true
    error.value = null
    try {
      const data = await ownerApi.search(term, page, pageSize, ctrl.signal)
      if (ctrl.signal.aborted) return
      const mapped = data.content.map(mapOwnerResponse)
      results.value = append ? [...results.value, ...mapped] : mapped
      nextPage = data.page + 1
      hasMore.value = nextPage < data.totalPages
      totalElements.value = data.totalElements
    } catch (e: unknown) {
      if (axios.isCancel(e) || ctrl.signal.aborted) return
      if (!append) clearResults()
      error.value = 'No se pudo realizar la búsqueda'
    } finally {
      if (!ctrl.signal.aborted) loading.value = false
    }
  }

  async function run(q: string) {
    const term = q.trim()
    currentTerm = term
    if (!term) {
      inflight?.abort()
      clearResults()
      loading.value = false
      error.value = null
      return
    }
    await fetchPage(term, 0, false)
  }

  /** Siguiente página del término actual. La llama el centinela del scroll. */
  async function loadMore() {
    if (loading.value || !hasMore.value || !currentTerm) return
    await fetchPage(currentTerm, nextPage, true)
  }

  watch(
    query,
    (q) => {
      clearTimer()
      timer = setTimeout(() => void run(q), debounceMs)
    },
    { immediate: false },
  )

  function reset() {
    clearTimer()
    inflight?.abort()
    currentTerm = ''
    clearResults()
    loading.value = false
    error.value = null
  }

  return { results, loading, error, hasMore, totalElements, loadMore, reset }
}

export type { OwnerResponse }

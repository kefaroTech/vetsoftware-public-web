import { ref, computed, onUnmounted, watch, type Ref } from 'vue'
import axios from 'axios'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

/**
 * Carga una página del servidor. `page` es 0-based, como el backend.
 * `query` llega solo si la pantalla ofrece búsqueda servida.
 */
export type ServerPageLoader<T> = (
  page: number,
  pageSize: number,
  query: string,
  signal: AbortSignal,
) => Promise<PageResponse<T>>

/**
 * Paginación servida por el backend, para tablas.
 *
 * <p>Es la contraparte de `useInfiniteList` (que es para listas scrolleables): mismo contrato
 * `PageResponse`, misma normalización, pero aquí se reemplaza la página en vez de acumularla,
 * porque una tabla con paginador numerado muestra una página cada vez.
 *
 * <p>Traduce entre las dos convenciones que conviven en el proyecto: el backend pagina desde 0
 * y el componente `Pagination` cuenta desde 1. Esa conversión vive aquí y en ningún otro sitio,
 * que es lo que evita el clásico error de una página de desfase.
 */
export function useServerPaged<T>(
  loader: ServerPageLoader<T>,
  options: { pageSize?: number; query?: Ref<string>; debounceMs?: number } = {},
) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const debounceMs = options.debounceMs ?? 300

  const items = ref([]) as Ref<T[]>
  /** 1-based: es lo que consume `Pagination`. */
  const page = ref(1)
  const total = ref(0)
  const pageCount = ref(1)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isEmpty = computed(() => !loading.value && total.value === 0)

  let inflight: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  async function fetchPage(oneBasedPage: number) {
    inflight?.abort()
    const ctrl = new AbortController()
    inflight = ctrl
    loading.value = true
    error.value = null
    try {
      const result = await loader(
        Math.max(oneBasedPage - 1, 0),
        pageSize,
        options.query?.value.trim() ?? '',
        ctrl.signal,
      )
      if (ctrl.signal.aborted) return
      items.value = result.content
      page.value = result.page + 1
      total.value = result.totalElements
      pageCount.value = Math.max(1, result.totalPages)
    } catch (e: unknown) {
      if (axios.isCancel(e) || ctrl.signal.aborted) return
      items.value = []
      total.value = 0
      pageCount.value = 1
      error.value = 'No se pudo cargar el listado'
    } finally {
      if (!ctrl.signal.aborted) loading.value = false
    }
  }

  /** Primera página. Se llama al abrir la pantalla y al cambiar de contexto. */
  function reload() {
    return fetchPage(1)
  }

  function goTo(oneBasedPage: number) {
    return fetchPage(oneBasedPage)
  }

  function reset() {
    inflight?.abort()
    if (timer) clearTimeout(timer)
    items.value = []
    page.value = 1
    total.value = 0
    pageCount.value = 1
    loading.value = false
    error.value = null
  }

  // Buscar reinicia a la primera pagina: mantener la 5 al cambiar de termino
  // deja al usuario mirando un hueco vacio del resultado nuevo.
  if (options.query) {
    watch(options.query, () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void fetchPage(1), debounceMs)
    })
  }

  onUnmounted(() => {
    inflight?.abort()
    if (timer) clearTimeout(timer)
  })

  return { items, page, total, pageCount, pageSize, loading, error, isEmpty, reload, goTo, reset }
}

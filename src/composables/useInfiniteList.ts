import { ref, computed, onUnmounted, shallowRef } from 'vue'
import axios from 'axios'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

/** Carga una página. Recibe el `signal` para poder abortarla si el filtro cambia. */
export type PageLoader<T> = (
  page: number,
  pageSize: number,
  signal: AbortSignal,
) => Promise<PageResponse<T>>

export interface UseInfiniteListOptions {
  pageSize?: number
  /**
   * Margen de precarga del centinela. Con 200px la página siguiente empieza a pedirse antes de
   * que el usuario toque el fondo, que es lo que hace que el scroll no se sienta a tirones.
   */
  rootMargin?: string
}

/**
 * Lista con scroll infinito sobre un endpoint paginado.
 *
 * <p>Acumula las páginas en un único array: al llegar al final del scroll se pide la siguiente y
 * se concatena, sin recargar lo ya cargado ni mover la posición del scroll.
 *
 * <p>Tres cosas que hacen que esto no se rompa en uso real, y que son la razón de que exista un
 * composable en vez de repetir la lógica en cada vista:
 *
 * - **Peticiones fuera de orden.** Al cambiar la búsqueda se aborta lo que esté en vuelo. Sin eso,
 *   la respuesta de un término viejo puede llegar después de la del nuevo y pisar los resultados.
 * - **Cargas duplicadas.** El centinela puede dispararse varias veces por el mismo borde; un
 *   guard por página evita pedir dos veces la misma.
 * - **Fin de datos.** Se para al alcanzar `totalPages`, así que no queda un observer pidiendo
 *   páginas vacías indefinidamente.
 */
export function useInfiniteList<T>(loader: PageLoader<T>, options: UseInfiniteListOptions = {}) {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE
  const rootMargin = options.rootMargin ?? '200px'

  /**
   * `shallowRef` y no `ref`: en el historial de un paciente crónico esta lista
   * acumula miles de DTO, y `ref` los haría reactivos en profundidad — un
   * `Proxy` por objeto y por campo anidado, en cada página que se concatena.
   * Aquí no hace falta: el array se **sustituye entero** (`:81`, `:130`) y
   * ningún consumidor muta un item en su sitio.
   *
   * Eso último es la condición para que esto sea correcto, y está comprobada en
   * los tres consumidores (`CuentasListaView`, `DocumentosView`, `useClinicalHistory`):
   * los tres solo leen —`v-for`, `.find`, `.length`—. **Si algún día alguien
   * escribe `items.value[i].campo = x`, la pantalla dejará de repintarse sin dar
   * ningún error.** La forma correcta de actualizar un elemento es sustituirlo:
   * `items.value = items.value.map((x) => (x.id === id ? { ...x, campo } : x))`.
   */
  const items = shallowRef<T[]>([])
  const page = ref(0)
  const totalElements = ref(0)
  const totalPages = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => page.value < totalPages.value)
  const isEmpty = computed(() => !loading.value && items.value.length === 0)

  let inflight: AbortController | null = null
  let observer: IntersectionObserver | null = null
  let requestedPage = -1

  async function fetchPage(next: number, append: boolean) {
    // El centinela puede dispararse varias veces sobre el mismo borde del scroll.
    if (requestedPage === next && append) return
    requestedPage = next

    inflight?.abort()
    const ctrl = new AbortController()
    inflight = ctrl
    loading.value = true
    error.value = null
    try {
      const result = await loader(next, pageSize, ctrl.signal)
      if (ctrl.signal.aborted) return
      items.value = append ? [...items.value, ...result.content] : result.content
      page.value = result.page + 1
      totalElements.value = result.totalElements
      totalPages.value = result.totalPages
    } catch (e: unknown) {
      if (axios.isCancel(e) || ctrl.signal.aborted) return
      error.value = 'No se pudo cargar el listado'
      requestedPage = -1 // permite reintentar la misma página
    } finally {
      if (!ctrl.signal.aborted) loading.value = false
    }
  }

  /** Primera página. Úsalo también al cambiar de filtro: descarta lo acumulado. */
  async function reload() {
    requestedPage = -1
    page.value = 0
    totalPages.value = 0
    await fetchPage(0, false)
  }

  /** Página siguiente, si queda alguna y no hay otra en curso. */
  async function loadMore() {
    if (loading.value || !hasMore.value) return
    await fetchPage(page.value, true)
  }

  /**
   * Conecta el centinela: un elemento vacío al final de la lista. Se usa `IntersectionObserver` y
   * no un listener de `scroll` porque no dispara en cada píxel ni obliga a leer el layout, así
   * que el scroll se mantiene fluido con miles de filas.
   */
  function observe(sentinel: Element | null) {
    observer?.disconnect()
    if (!sentinel) return
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { rootMargin },
    )
    observer.observe(sentinel)
  }

  function reset() {
    inflight?.abort()
    observer?.disconnect()
    observer = null
    requestedPage = -1
    items.value = []
    page.value = 0
    totalElements.value = 0
    totalPages.value = 0
    loading.value = false
    error.value = null
  }

  onUnmounted(() => {
    inflight?.abort()
    observer?.disconnect()
  })

  return {
    items,
    loading,
    error,
    hasMore,
    isEmpty,
    totalElements,
    reload,
    loadMore,
    observe,
    reset,
  }
}

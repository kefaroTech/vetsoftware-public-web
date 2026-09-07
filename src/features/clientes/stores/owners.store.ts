import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Owner } from '@/types/domain'
import { ownerApi } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import { mapOwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.mapper'
import type {
  CreateOwnerRequest,
  UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import { DEFAULT_PAGE_SIZE } from '@/types/pagination'
import { getProblemDetailMessage } from '@/services/http/http.client'

export const useOwnersStore = defineStore('owners', () => {
  const owners = ref<Owner[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // `page` es 1-based (lo consume Pagination.vue); el backend es 0-based.
  const query = ref('')
  const page = ref(1)
  const pageSize = ref(DEFAULT_PAGE_SIZE)
  const totalElements = ref(0)
  const totalPages = ref(0)

  // Descarta respuestas obsoletas cuando el usuario teclea rápido (last-write-wins).
  let reqSeq = 0

  async function search(): Promise<void> {
    loading.value = true
    error.value = null
    const seq = ++reqSeq
    try {
      const q = query.value.trim()
      const res = q
        ? await ownerApi.search(q, page.value - 1, pageSize.value)
        : await ownerApi.listPage(page.value - 1, pageSize.value)
      if (seq !== reqSeq) return
      owners.value = res.content.map(mapOwnerResponse)
      totalElements.value = res.totalElements
      totalPages.value = res.totalPages
      // La página quedó vacía pero hay resultados (p.ej. tras borrar el último de la última página): retrocede.
      if (page.value > 1 && res.content.length === 0 && res.totalElements > 0) {
        page.value = Math.max(1, res.totalPages)
        return search()
      }
    } catch (e) {
      if (seq !== reqSeq) return
      error.value = getProblemDetailMessage(e, 'No pudimos cargar los clientes')
      throw e
    } finally {
      if (seq === reqSeq) loading.value = false
    }
  }

  function setQuery(q: string): Promise<void> {
    if (q === query.value) return Promise.resolve()
    query.value = q
    page.value = 1
    return search()
  }

  function setPage(p: number): Promise<void> {
    if (p === page.value) return Promise.resolve()
    page.value = p
    return search()
  }

  function refresh(): Promise<void> {
    return search()
  }

  /**
   * Reinicia el filtro y la paginación. El store es un singleton que sobrevive a la navegación, así que al
   * entrar de nuevo a la pantalla hay que limpiarlo para no arrastrar la búsqueda anterior. Invalida cualquier
   * petición en vuelo (reqSeq) para que su respuesta tardía no repueble el estado ya reseteado.
   */
  function reset(): void {
    reqSeq++
    query.value = ''
    page.value = 1
    owners.value = []
    totalElements.value = 0
    totalPages.value = 0
    error.value = null
  }

  async function create(payload: CreateOwnerRequest): Promise<Owner> {
    const created = await ownerApi.create(payload)
    await search()
    return mapOwnerResponse(created)
  }

  async function update(id: number, payload: UpdateOwnerRequest): Promise<Owner> {
    const updated = await ownerApi.update(id, payload)
    const mapped = mapOwnerResponse(updated)
    owners.value = owners.value.map((o) => (o.id === String(id) ? mapped : o))
    return mapped
  }

  async function remove(id: number): Promise<void> {
    await ownerApi.remove(id)
    await search()
  }

  return {
    owners,
    loading,
    error,
    query,
    page,
    pageSize,
    totalElements,
    totalPages,
    search,
    setQuery,
    setPage,
    refresh,
    reset,
    create,
    update,
    remove,
  }
})

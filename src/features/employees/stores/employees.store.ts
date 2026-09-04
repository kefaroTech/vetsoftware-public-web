import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Employee } from '@/types/domain'
import { employeeApi } from '../api/employee.api'
import type { CreateEmployeeRequest, UpdateEmployeeRequest } from '../types/employee.types'
import { mapEmployeeResponse } from '../api/employee.mapper'
import { getProblemDetailMessage } from '@/services/http/http.client'

const DEFAULT_PAGE_SIZE = 15

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Búsqueda + paginación server-side. `page` es 1-based (lo consume Pagination.vue); el backend es 0-based.
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
      const res = await employeeApi.search({
        q: query.value,
        page: page.value - 1,
        pageSize: pageSize.value,
      })
      if (seq !== reqSeq) return
      employees.value = res.content.map(mapEmployeeResponse)
      totalElements.value = res.totalElements
      totalPages.value = res.totalPages
      // La página quedó vacía pero hay resultados (p.ej. tras desactivar el último de la última página): retrocede.
      if (page.value > 1 && res.content.length === 0 && res.totalElements > 0) {
        page.value = Math.max(1, res.totalPages)
        return search()
      }
    } catch (e) {
      if (seq !== reqSeq) return
      error.value = getProblemDetailMessage(e, 'No pudimos cargar los empleados')
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

  /** Refresca la página actual (tras cambios de roles/sedes que la respuesta no devuelve). */
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
    employees.value = []
    totalElements.value = 0
    totalPages.value = 0
    error.value = null
  }

  async function create(payload: CreateEmployeeRequest): Promise<Employee> {
    const created = await employeeApi.create(payload)
    // La respuesta de alta no trae sedes/roles ni recomputa la paginación → refrescamos la página actual.
    await search()
    return mapEmployeeResponse(created)
  }

  async function update(id: number, payload: UpdateEmployeeRequest): Promise<Employee> {
    const updated = await employeeApi.update(id, payload)
    const mapped = mapEmployeeResponse(updated)
    // PUT /employees/{id} no devuelve roles ni sedes; preservamos los de cache.
    employees.value = employees.value.map((e) =>
      e.id === id ? { ...mapped, roles: e.roles, branches: e.branches } : e,
    )
    return mapped
  }

  async function deactivate(id: number): Promise<void> {
    await employeeApi.deactivate(id)
    // El listado incluye desactivados: la fila permanece, solo cambia el estado.
    employees.value = employees.value.map((e) => (e.id === id ? { ...e, enabled: false } : e))
  }

  async function reactivate(id: number): Promise<Employee> {
    const updated = await employeeApi.reactivate(id)
    const mapped = mapEmployeeResponse(updated)
    // PATCH /employees/{id}/enable devuelve EmployeeDto sin roles ni sedes; preservamos cache.
    employees.value = employees.value.map((e) =>
      e.id === id ? { ...mapped, roles: e.roles, branches: e.branches } : e,
    )
    return mapped
  }

  async function resendInvitation(id: number, password: string): Promise<Employee> {
    const updated = await employeeApi.resendInvitation(id, password)
    const mapped = mapEmployeeResponse(updated)
    // El endpoint devuelve roles pero no sedes; preservamos las sedes de cache.
    employees.value = employees.value.map((e) =>
      e.id === id ? { ...mapped, branches: e.branches } : e,
    )
    return mapped
  }

  return {
    employees,
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
    deactivate,
    reactivate,
    resendInvitation,
  }
})

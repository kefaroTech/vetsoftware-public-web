import { computed, ref } from 'vue'
import type { Employee } from '@/types/domain'
import {
  employeeApi,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from '../api/employee.api'
import { mapEmployeeResponse } from '../api/employee.mapper'

const cache = ref<Employee[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let inFlight: Promise<void> | null = null

export function useEmployees() {
  const employees = computed<Employee[]>(() => cache.value)

  async function fetchAll(): Promise<void> {
    if (inFlight) return inFlight
    loading.value = true
    error.value = null
    inFlight = (async () => {
      try {
        const list = await employeeApi.listByCompany()
        cache.value = list.map(mapEmployeeResponse)
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Error al cargar empleados'
        throw e
      } finally {
        loading.value = false
        inFlight = null
      }
    })()
    return inFlight
  }

  async function create(payload: CreateEmployeeRequest): Promise<Employee> {
    const created = await employeeApi.create(payload)
    const mapped = mapEmployeeResponse(created)
    cache.value = [...cache.value, mapped]
    return mapped
  }

  async function update(id: number, payload: UpdateEmployeeRequest): Promise<Employee> {
    const updated = await employeeApi.update(id, payload)
    const mapped = mapEmployeeResponse(updated)
    // El endpoint PUT /employees/{id} no devuelve roles (los lee solo /by-company).
    // Preservamos los roles que ya teníamos en cache para esta entidad.
    cache.value = cache.value.map((e) => (e.id === id ? { ...mapped, roles: e.roles } : e))
    return mapped
  }

  async function setStatus(employee: Employee, status: 'ACTIVE' | 'INACTIVE'): Promise<Employee> {
    return update(employee.id, {
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      status,
    })
  }

  return {
    employees,
    loading,
    error,
    fetchAll,
    create,
    update,
    setStatus,
  }
}

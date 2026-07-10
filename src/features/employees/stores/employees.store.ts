import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Employee } from '@/types/domain'
import {
  employeeApi,
  type CreateEmployeeRequest,
  type UpdateEmployeeRequest,
} from '../api/employee.api'
import { mapEmployeeResponse } from '../api/employee.mapper'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let inFlight: Promise<void> | null = null

  async function fetchAll(): Promise<void> {
    if (inFlight) return inFlight
    loading.value = true
    error.value = null
    inFlight = (async () => {
      try {
        const list = await employeeApi.listByCompany()
        employees.value = list.map(mapEmployeeResponse)
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
    employees.value = [...employees.value, mapped]
    return mapped
  }

  async function update(id: number, payload: UpdateEmployeeRequest): Promise<Employee> {
    const updated = await employeeApi.update(id, payload)
    const mapped = mapEmployeeResponse(updated)
    // PUT /employees/{id} no devuelve roles; preservamos los de cache.
    employees.value = employees.value.map((e) => (e.id === id ? { ...mapped, roles: e.roles } : e))
    return mapped
  }

  async function deactivate(id: number): Promise<void> {
    await employeeApi.deactivate(id)
    employees.value = employees.value.map((e) => (e.id === id ? { ...e, enabled: false } : e))
  }

  async function reactivate(id: number): Promise<Employee> {
    const updated = await employeeApi.reactivate(id)
    const mapped = mapEmployeeResponse(updated)
    // PATCH /employees/{id}/enable devuelve EmployeeDto sin roles; preservamos cache.
    employees.value = employees.value.map((e) => (e.id === id ? { ...mapped, roles: e.roles } : e))
    return mapped
  }

  async function resendInvitation(id: number, password: string): Promise<Employee> {
    const updated = await employeeApi.resendInvitation(id, password)
    const mapped = mapEmployeeResponse(updated)
    // El endpoint devuelve el empleado con sus roles; refrescamos la fila en cache.
    employees.value = employees.value.map((e) => (e.id === id ? mapped : e))
    return mapped
  }

  return {
    employees,
    loading,
    error,
    fetchAll,
    create,
    update,
    deactivate,
    reactivate,
    resendInvitation,
  }
})

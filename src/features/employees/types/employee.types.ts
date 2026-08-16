export interface EmployeeCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface EmployeeRoleSummary {
  employeeRoleId: number
  id: number
  name: string
  code: string
}

export interface EmployeeBranchSummary {
  id: number
  name: string
}

export interface EmployeeResponse {
  id: number
  employeeCode: string
  name: string
  email: string
  enabled: boolean
  mustChangePassword: boolean
  status: 'INVITED' | 'ACTIVE'
  company: EmployeeCompanySummary
  roles: EmployeeRoleSummary[]
  branches: EmployeeBranchSummary[]
  createdDate: string
}

/** Envoltura genérica de respuesta paginada del backend (GET /employees/search). */
export interface PageResponse<T> {
  content: T[]
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}

export interface SearchEmployeesParams {
  q?: string
  page: number // 0-based (backend)
  pageSize: number
}

export interface CreateEmployeeRequest {
  employeeCode: string
  password: string
  name: string
  email: string
  roleIds: number[]
  // Sedes a asignar en el alta (al menos una). El backend crea empleado + roles + sedes en una transacción.
  branchIds: number[]
}

/**
 * TR-01: llevaba un `status` que el backend **no acepta**. `PUT /employees/{id}` recibe solo
 * estos tres campos, así que el estado viajaba y se descartaba en silencio; activar o desactivar
 * un empleado se hace con `DELETE /employees/{id}` y `PATCH /employees/{id}/enable`, que es lo
 * que la pantalla ya usaba de verdad. Lo destapó la atadura al contrato.
 */
export interface UpdateEmployeeRequest {
  employeeCode: string
  name: string
  email: string
}

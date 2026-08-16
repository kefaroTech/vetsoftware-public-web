export interface CreateEmployeeRoleRequest {
  employeeId: number
  roleId: number
}

export interface EmployeeRoleResponse {
  id: number
  employee: { id: number; employeeCode: string; name: string }
  role: { id: number; name: string; code: string }
  createdDate: string
}

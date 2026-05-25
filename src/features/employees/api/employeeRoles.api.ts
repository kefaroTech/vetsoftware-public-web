import { http } from '@/services/http/http.client'

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

export const employeeRolesApi = {
  async create(payload: CreateEmployeeRoleRequest): Promise<EmployeeRoleResponse> {
    const { data } = await http.post<EmployeeRoleResponse>('/employee-roles', payload)
    return data
  },

  async remove(employeeRoleId: number): Promise<void> {
    await http.delete(`/employee-roles/${employeeRoleId}`)
  },
}

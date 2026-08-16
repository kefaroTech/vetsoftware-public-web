import type { CreateEmployeeRoleRequest, EmployeeRoleResponse } from '../types/employeeRoles.types'
import { http } from '@/services/http/http.client'

export const employeeRolesApi = {
  async create(payload: CreateEmployeeRoleRequest): Promise<EmployeeRoleResponse> {
    const { data } = await http.post<EmployeeRoleResponse>('/employee-roles', payload)
    return data
  },

  async remove(employeeRoleId: number): Promise<void> {
    await http.delete(`/employee-roles/${employeeRoleId}`)
  },
}

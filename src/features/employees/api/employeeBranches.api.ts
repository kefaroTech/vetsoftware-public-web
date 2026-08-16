import type {
  EmployeeBranchesResponse,
  SetEmployeeBranchesRequest,
} from '../types/employeeBranches.types'
import { http } from '@/services/http/http.client'

export const employeeBranchesApi = {
  async get(employeeId: number): Promise<EmployeeBranchesResponse> {
    const { data } = await http.get<EmployeeBranchesResponse>(`/employees/${employeeId}/branches`)
    return data
  },

  async set(
    employeeId: number,
    payload: SetEmployeeBranchesRequest,
  ): Promise<EmployeeBranchesResponse> {
    const { data } = await http.put<EmployeeBranchesResponse>(
      `/employees/${employeeId}/branches`,
      payload,
    )
    return data
  },
}

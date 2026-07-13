import { http } from '@/services/http/http.client'

/** Alcance por sede de un empleado (multi-sucursal). El backend deriva companyId del JWT. */
export interface EmployeeBranchesResponse {
  employeeId: number
  branchIds: number[]
}

/**
 * Set atómico de sedes. `allBranches=true` asigna todas las de la empresa (ignora branchIds); si es false, asigna
 * exactamente branchIds. El backend rechaza un set vacío (para bloquear a un empleado se lo desactiva).
 */
export interface SetEmployeeBranchesRequest {
  allBranches: boolean
  branchIds: number[]
}

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

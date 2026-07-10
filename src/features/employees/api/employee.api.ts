import { http } from '@/services/http/http.client'

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

export interface EmployeeResponse {
  id: number
  employeeCode: string
  name: string
  email: string
  enabled: boolean
  mustChangePassword: boolean
  company: EmployeeCompanySummary
  roles: EmployeeRoleSummary[]
  createdDate: string
}

export interface CreateEmployeeRequest {
  employeeCode: string
  password: string
  name: string
  email: string
  companyId: number
  roleIds: number[]
}

export interface UpdateEmployeeRequest {
  employeeCode: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
}

export const employeeApi = {
  async listAll(): Promise<EmployeeResponse[]> {
    const { data } = await http.get<EmployeeResponse[]>('/employees')
    return data
  },

  async listByCompany(): Promise<EmployeeResponse[]> {
    const { data } = await http.get<EmployeeResponse[]>('/employees/by-company')
    return data
  },

  async findById(id: number): Promise<EmployeeResponse> {
    const { data } = await http.get<EmployeeResponse>(`/employees/${id}`)
    return data
  },

  async create(payload: CreateEmployeeRequest): Promise<EmployeeResponse> {
    const { data } = await http.post<EmployeeResponse>('/employees', payload)
    return data
  },

  // Autogeneración: sugiere un código disponible a partir del nombre (prefijo = iniciales de la empresa).
  async suggestCode(name: string): Promise<string> {
    const { data } = await http.get<{ code: string }>('/employees/suggest-code', {
      params: { name },
      skipGlobalLoader: true,
    })
    return data.code
  },

  // Chequeo en vivo de disponibilidad del código de empleado.
  async checkCodeAvailability(code: string): Promise<boolean> {
    const { data } = await http.get<{ available: boolean }>('/employees/code-availability', {
      params: { code },
      skipGlobalLoader: true,
    })
    return data.available
  },

  async update(id: number, payload: UpdateEmployeeRequest): Promise<EmployeeResponse> {
    const { data } = await http.put<EmployeeResponse>(`/employees/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/employees/${id}`)
  },

  async deactivate(id: number): Promise<void> {
    await http.delete(`/employees/${id}`)
  },

  async reactivate(id: number): Promise<EmployeeResponse> {
    const { data } = await http.patch<EmployeeResponse>(`/employees/${id}/enable`)
    return data
  },
}

import { http } from '@/services/http/http.client'

export interface EmployeeCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface EmployeeRoleSummary {
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
  company: EmployeeCompanySummary
  roles: EmployeeRoleSummary[]
  createdDate: string
}

export interface CreateEmployeeRequest {
  employeeCode: string
  password: string
  name: string
  email: string
  status: 'ACTIVE' | 'INACTIVE'
  companyId: number
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

  async update(id: number, payload: UpdateEmployeeRequest): Promise<EmployeeResponse> {
    const { data } = await http.put<EmployeeResponse>(`/employees/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/employees/${id}`)
  },
}

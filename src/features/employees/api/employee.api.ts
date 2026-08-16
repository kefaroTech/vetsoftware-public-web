import type {
  EmployeeResponse,
  PageResponse,
  SearchEmployeesParams,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
} from '../types/employee.types'
import { http } from '@/services/http/http.client'

export const employeeApi = {
  async listAll(): Promise<EmployeeResponse[]> {
    const { data } = await http.get<EmployeeResponse[]>('/employees')
    return data
  },

  async listByCompany(): Promise<EmployeeResponse[]> {
    const { data } = await http.get<EmployeeResponse[]>('/employees/by-company')
    return data
  },

  // Listado paginado + búsqueda server-side (nombre/código/correo). El backend deriva la empresa del JWT.
  async search(params: SearchEmployeesParams): Promise<PageResponse<EmployeeResponse>> {
    const query: Record<string, string | number> = {
      page: params.page,
      pageSize: params.pageSize,
    }
    const q = params.q?.trim()
    if (q) query.q = q
    const { data } = await http.get<PageResponse<EmployeeResponse>>('/employees/search', {
      params: query,
      skipGlobalLoader: true,
    })
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

  // Reenvía la invitación a un empleado invitado con una nueva contraseña provisional.
  async resendInvitation(id: number, password: string): Promise<EmployeeResponse> {
    const { data } = await http.post<EmployeeResponse>(`/employees/${id}/resend-invitation`, {
      password,
    })
    return data
  },
}

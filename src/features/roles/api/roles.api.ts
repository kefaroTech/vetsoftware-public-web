import { http } from '@/services/http/http.client'
import type {
  CreateRoleRequest,
  RoleResponse,
  UpdateRoleRequest,
} from '../types'

export const rolesApi = {
  async listAll(): Promise<RoleResponse[]> {
    const { data } = await http.get<RoleResponse[]>('/roles')
    return data
  },

  async findById(id: number): Promise<RoleResponse> {
    const { data } = await http.get<RoleResponse>(`/roles/${id}`)
    return data
  },

  async create(payload: CreateRoleRequest): Promise<RoleResponse> {
    const { data } = await http.post<RoleResponse>('/roles', payload)
    return data
  },

  async update(id: number, payload: UpdateRoleRequest): Promise<RoleResponse> {
    const { data } = await http.put<RoleResponse>(`/roles/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/roles/${id}`)
  },
}

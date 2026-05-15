import { http } from '@/services/http/http.client'
import type {
  CreateRolePermissionRequest,
  RolePermissionResponse,
} from '../types'

export const rolePermissionsApi = {
  async create(
    payload: CreateRolePermissionRequest,
  ): Promise<RolePermissionResponse> {
    const { data } = await http.post<RolePermissionResponse>(
      '/role-permissions',
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/role-permissions/${id}`)
  },
}

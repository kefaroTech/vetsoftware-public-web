import { http } from '@/services/http/http.client'
import type {
  CreateRolePermissionRequest,
  RolePermissionResponse,
  SyncRolePermissionsRequest,
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

  async syncByRole(
    roleId: number,
    payload: SyncRolePermissionsRequest,
  ): Promise<RolePermissionResponse[]> {
    const { data } = await http.put<RolePermissionResponse[]>(
      `/role-permissions/by-role/${roleId}`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/role-permissions/${id}`)
  },
}

import { http } from '@/services/http/http.client'
import type { PermissionResponse } from '../types'

export const permissionsApi = {
  async listByCompany(): Promise<PermissionResponse[]> {
    const { data } = await http.get<PermissionResponse[]>('/permissions/by-company')
    return data
  },
}

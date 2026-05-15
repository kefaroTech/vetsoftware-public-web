import { http } from '@/services/http/http.client'
import type { SubModuleResponse } from '../types'

export const subModulesApi = {
  async listAll(): Promise<SubModuleResponse[]> {
    const { data } = await http.get<SubModuleResponse[]>('/sub-modules')
    return data
  },
}

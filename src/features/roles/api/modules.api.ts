import { http } from '@/services/http/http.client'
import type { ModuleResponse } from '../types'

export const modulesApi = {
  async listAll(): Promise<ModuleResponse[]> {
    const { data } = await http.get<ModuleResponse[]>('/modules')
    return data
  },
}

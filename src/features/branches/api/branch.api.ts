import { http } from '@/services/http/http.client'

/** Sucursal (sede) de la empresa. GET /branches devuelve activas e inactivas; el selector filtra activas. */
export interface BranchResponse {
  id: number
  name: string
  code: string
  active: boolean
}

export const branchApi = {
  async listAll(): Promise<BranchResponse[]> {
    const { data } = await http.get<BranchResponse[]>('/branches')
    return data
  },
}

import { http } from '@/services/http/http.client'

/** Sucursal (sede) de la empresa. GET /branches devuelve activas e inactivas; el selector filtra activas. */
export interface BranchResponse {
  id: number
  name: string
  code: string
  address: string | null
  phone: string | null
  city: { id: number; name: string }
  active: boolean
}

/** Payload de creación/edición de sede. `companyId` lo deriva el backend del JWT (nunca del cliente). */
export interface SaveBranchRequest {
  name: string
  code: string
  address?: string | null
  phone?: string | null
  cityId: number
}

export const branchApi = {
  async listAll(): Promise<BranchResponse[]> {
    const { data } = await http.get<BranchResponse[]>('/branches')
    return data
  },

  async create(payload: SaveBranchRequest): Promise<BranchResponse> {
    const { data } = await http.post<BranchResponse>('/branches', payload)
    return data
  },

  async update(id: number, payload: SaveBranchRequest): Promise<BranchResponse> {
    const { data } = await http.put<BranchResponse>(`/branches/${id}`, payload)
    return data
  },

  async activate(id: number): Promise<BranchResponse> {
    const { data } = await http.patch<BranchResponse>(`/branches/${id}/activate`)
    return data
  },

  async deactivate(id: number): Promise<BranchResponse> {
    const { data } = await http.patch<BranchResponse>(`/branches/${id}/deactivate`)
    return data
  },
}

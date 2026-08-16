import type { BranchResponse, SaveBranchRequest } from '../types/branch.types'
import { http } from '@/services/http/http.client'

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

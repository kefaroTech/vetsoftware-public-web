import { http } from '@/services/http/http.client'
import type {
  NumberingResolutionResponse,
  SaveNumberingResolutionRequest,
} from '../types/facturacion'

export const numberingResolutionApi = {
  async listAll(): Promise<NumberingResolutionResponse[]> {
    const { data } = await http.get<NumberingResolutionResponse[]>('/numbering-resolutions')
    return data
  },

  async findById(id: number): Promise<NumberingResolutionResponse> {
    const { data } = await http.get<NumberingResolutionResponse>(`/numbering-resolutions/${id}`)
    return data
  },

  async create(payload: SaveNumberingResolutionRequest): Promise<NumberingResolutionResponse> {
    const { data } = await http.post<NumberingResolutionResponse>('/numbering-resolutions', payload)
    return data
  },

  async update(
    id: number,
    payload: SaveNumberingResolutionRequest,
  ): Promise<NumberingResolutionResponse> {
    const { data } = await http.put<NumberingResolutionResponse>(
      `/numbering-resolutions/${id}`,
      payload,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/numbering-resolutions/${id}`)
  },

  async reactivate(id: number): Promise<NumberingResolutionResponse> {
    const { data } = await http.patch<NumberingResolutionResponse>(
      `/numbering-resolutions/${id}/enable`,
    )
    return data
  },
}

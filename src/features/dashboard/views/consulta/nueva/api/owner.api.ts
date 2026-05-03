import { http } from '@/services/http/http.client'

export interface CitySummary {
  id: number
  name: string
}

export interface CompanySummary {
  id: number
  name: string
  identifier: string
}

export interface OwnerResponse {
  id: number
  name: string
  email: string
  document: string
  address: string
  phone: string
  city: CitySummary
  company: CompanySummary
  createdDate: string
}

export interface CreateOwnerRequest {
  name: string
  email: string
  document: string
  address: string
  phone: string
  cityId: number
  companyId: number
}

export interface UpdateOwnerRequest extends CreateOwnerRequest {}

export const ownerApi = {
  async create(payload: CreateOwnerRequest): Promise<OwnerResponse> {
    const { data } = await http.post<OwnerResponse>('/owners', payload)
    return data
  },

  async listAll(): Promise<OwnerResponse[]> {
    const { data } = await http.get<OwnerResponse[]>('/owners')
    return data
  },

  async search(query: string): Promise<OwnerResponse[]> {
    const { data } = await http.get<OwnerResponse[]>('/owners/search', {
      params: { q: query },
    })
    return data
  },

  async findById(id: number): Promise<OwnerResponse> {
    const { data } = await http.get<OwnerResponse>(`/owners/${id}`)
    return data
  },

  async update(id: number, payload: UpdateOwnerRequest): Promise<OwnerResponse> {
    const { data } = await http.put<OwnerResponse>(`/owners/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/owners/${id}`)
  },
}

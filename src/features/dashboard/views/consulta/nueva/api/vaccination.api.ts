import type { CreateVaccinationPayload, VaccinationResponse } from '../types/vaccination.types'
import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

export const vaccinationApi = {
  async create(payload: CreateVaccinationPayload): Promise<VaccinationResponse> {
    const { data } = await http.post<VaccinationResponse>('/vaccinations', payload)
    return data
  },

  async listAll(): Promise<VaccinationResponse[]> {
    const { data } = await http.get<VaccinationResponse[]>('/vaccinations')
    return data
  },

  async listByAnimal(
    animalId: number,
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<VaccinationResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<VaccinationResponse>>(
      `/vaccinations/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<VaccinationResponse> {
    const { data } = await http.get<VaccinationResponse>(`/vaccinations/${id}`)
    return data
  },

  async update(id: number, payload: CreateVaccinationPayload): Promise<VaccinationResponse> {
    const { data } = await http.put<VaccinationResponse>(`/vaccinations/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/vaccinations/${id}`)
  },
}

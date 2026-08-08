import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'

export interface CreateVaccinationPayload {
  date: string
  vaccinationTypeId: number
  lot: string
  notes: string
  nextVaccination: string | null
  animalId: number
  consultationId: number | null
  companyId: number
}

export interface VaccinationTypeSummary {
  id: number
  name: string
}

export interface VaccinationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface VaccinationConsultationSummary {
  id: number
  date: string
}

export interface VaccinationCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface VaccinationResponse {
  id: number
  date: string
  vaccinationType: VaccinationTypeSummary
  lot: string
  notes: string
  nextVaccination: string | null
  animal: VaccinationAnimalSummary
  consultation: VaccinationConsultationSummary | null
  company: VaccinationCompanySummary
  createdDate: string
}

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
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<VaccinationResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<VaccinationResponse>>(
      `/vaccinations/by-animal/${animalId}`,
      {
        params: { page, pageSize },
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

import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type { HospitalizationType, ReasonLeaving } from '@/types/domain'

export interface CreateHospitalizationPayload {
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  animalId: number
  consultationId: number | null
  companyId: number
  // Peso opcional al ingreso → historial de peso del animal.
  weight?: number | null
  weightUnit?: string | null
}

export interface HospitalizationAnimalSummary {
  id: number
  name: string
  code: string
}

export interface HospitalizationConsultationSummary {
  id: number
  date: string
}

export interface HospitalizationCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface HospitalizationResponse {
  id: number
  date: string
  startDate: string
  endDate: string | null
  type: HospitalizationType
  reasonLeaving: ReasonLeaving | null
  reason: string
  observations: string
  animal: HospitalizationAnimalSummary
  consultation: HospitalizationConsultationSummary | null
  company: HospitalizationCompanySummary
  createdDate: string
  enabled: boolean
}

export const hospitalizationApi = {
  async create(payload: CreateHospitalizationPayload): Promise<HospitalizationResponse> {
    const { data } = await http.post<HospitalizationResponse>('/hospitalizations', payload)
    return data
  },

  // BE-29: `/hospitalizations` es el listado global de la plataforma y hoy solo lo
  // alcanza ROLE_SYSTEM. El tablero pide el de su empresa; antes traia el de todas
  // y descartaba las ajenas en el navegador.
  async listByCompany(): Promise<HospitalizationResponse[]> {
    const { data } = await http.get<HospitalizationResponse[]>('/hospitalizations/by-company')
    return data
  },

  async listByAnimal(
    animalId: number,
    query = '',
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<HospitalizationResponse>> {
    // BE-06: el historial por animal llega paginado; el consumidor acumula paginas.
    const { data } = await http.get<PageResponse<HospitalizationResponse>>(
      `/hospitalizations/by-animal/${animalId}`,
      {
        params: { q: query || undefined, page, pageSize },
        signal,
      },
    )
    return data
  },

  async findById(id: number): Promise<HospitalizationResponse> {
    const { data } = await http.get<HospitalizationResponse>(`/hospitalizations/${id}`)
    return data
  },

  async update(
    id: number,
    payload: CreateHospitalizationPayload,
  ): Promise<HospitalizationResponse> {
    const { data } = await http.put<HospitalizationResponse>(`/hospitalizations/${id}`, payload)
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`/hospitalizations/${id}`)
  },
}

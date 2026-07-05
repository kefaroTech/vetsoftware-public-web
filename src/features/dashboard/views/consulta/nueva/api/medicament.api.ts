import { http } from '@/services/http/http.client'

export interface MedicamentCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface MedicamentResponse {
  id: number
  name: string
  description: string | null
  company: MedicamentCompanySummary | null
  general: boolean
  createdDate: string
  enabled: boolean
}

export interface CreateMedicamentPayload {
  name: string
  description: string
}

export interface UpdateMedicamentPayload {
  name: string
  description: string
}

export const medicamentApi = {
  /** Catálogo disponible para la empresa (globales + propios), habilitados. Para el picker. */
  async listAvailable(): Promise<MedicamentResponse[]> {
    const { data } = await http.get<MedicamentResponse[]>('/medicaments/available')
    return data
  },
  /** Todos los medicamentos (para la pantalla de administración). */
  async listAll(): Promise<MedicamentResponse[]> {
    const { data } = await http.get<MedicamentResponse[]>('/medicaments')
    return data
  },
  /** Medicamentos pausados (enabled=false) propios de la empresa, para reactivar. */
  async listDisabled(): Promise<MedicamentResponse[]> {
    const { data } = await http.get<MedicamentResponse[]>('/medicaments/disabled')
    return data
  },
  async findById(id: number): Promise<MedicamentResponse> {
    const { data } = await http.get<MedicamentResponse>(`/medicaments/${id}`)
    return data
  },
  async create(payload: CreateMedicamentPayload): Promise<MedicamentResponse> {
    const { data } = await http.post<MedicamentResponse>('/medicaments', payload)
    return data
  },
  async update(id: number, payload: UpdateMedicamentPayload): Promise<MedicamentResponse> {
    const { data } = await http.put<MedicamentResponse>(`/medicaments/${id}`, payload)
    return data
  },
  async remove(id: number): Promise<void> {
    await http.delete(`/medicaments/${id}`)
  },
  async enable(id: number): Promise<MedicamentResponse> {
    const { data } = await http.patch<MedicamentResponse>(`/medicaments/${id}/enable`)
    return data
  },
}

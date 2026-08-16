import type {
  MedicamentResponse,
  CreateMedicamentPayload,
  UpdateMedicamentPayload,
} from '../types/medicament.types'
import { http } from '@/services/http/http.client'

export const medicamentApi = {
  /** Catálogo disponible para la empresa (globales + propios), habilitados. Para el picker. */
  async listAvailable(): Promise<MedicamentResponse[]> {
    const { data } = await http.get<MedicamentResponse[]>('/medicaments/available')
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

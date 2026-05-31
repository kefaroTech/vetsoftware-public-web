import { http } from '@/services/http/http.client'
import type {
  MedicationFrequency,
  GuidelineType,
  DurationMeasure,
} from '@/types/domain'

/** Payload de creación — el backend deriva createdBy del JWT. */
export interface CreateHospitalizationMedicationPayload {
  name: string
  dose: string | null
  frequency: MedicationFrequency | null
  guidelineType: GuidelineType | null
  durationMeasure: DurationMeasure | null
  durationQuantity: number | null
  startDate: string | null
  startTime: string | null // 'HH:mm'
  notes: string | null
  hospitalizationId: number
}

/** Update reusa los mismos campos sin hospitalizationId (inmutable). */
export type UpdateHospitalizationMedicationPayload = Omit<
  CreateHospitalizationMedicationPayload,
  'hospitalizationId'
>

export interface MedicationEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface MedicationHospitalizationSummary {
  id: number
  date: string
}

export interface HospitalizationMedicationResponse {
  id: number
  name: string
  dose: string | null
  frequency: MedicationFrequency | null
  guidelineType: GuidelineType | null
  durationMeasure: DurationMeasure | null
  durationQuantity: number | null
  startDate: string | null
  startTime: string | null
  notes: string | null
  hospitalization: MedicationHospitalizationSummary
  createdBy: MedicationEmployeeSummary
  createdDate: string
  enabled: boolean
  suspensionDate: string | null
  suspensionBy: MedicationEmployeeSummary | null
}

const BASE = '/hospitalization-medications'

export const hospitalizationMedicationApi = {
  async create(
    payload: CreateHospitalizationMedicationPayload,
  ): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.post<HospitalizationMedicationResponse>(BASE, payload)
    return data
  },

  async update(
    id: number,
    payload: UpdateHospitalizationMedicationPayload,
  ): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.put<HospitalizationMedicationResponse>(
      `${BASE}/${id}`,
      payload,
    )
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationMedicationResponse[]> {
    const { data } = await http.get<HospitalizationMedicationResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },

  /** Suspende la medicación (registra suspensionDate/By). */
  async suspend(id: number): Promise<HospitalizationMedicationResponse> {
    const { data } = await http.patch<HospitalizationMedicationResponse>(`${BASE}/${id}/suspend`)
    return data
  },
}

import { http } from '@/services/http/http.client'
import type { MedicationFrequency, GuidelineType, DurationMeasure } from '@/types/domain'

/** Procedimientos: igual que medicación, `dose` opcional y normalmente vacío. */
export interface CreateHospitalizationProcedurePayload {
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

export type UpdateHospitalizationProcedurePayload = Omit<
  CreateHospitalizationProcedurePayload,
  'hospitalizationId'
>

export interface ProcedureEmployeeSummary {
  id: number
  employeeCode: string
  name: string
}

export interface ProcedureHospitalizationSummary {
  id: number
  date: string
}

export interface HospitalizationProcedureResponse {
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
  hospitalization: ProcedureHospitalizationSummary
  createdBy: ProcedureEmployeeSummary
  createdDate: string
  enabled: boolean
  suspensionDate: string | null
  suspensionBy: ProcedureEmployeeSummary | null
}

const BASE = '/hospitalization-procedures'

export const hospitalizationProcedureApi = {
  async create(
    payload: CreateHospitalizationProcedurePayload,
  ): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.post<HospitalizationProcedureResponse>(BASE, payload)
    return data
  },

  async update(
    id: number,
    payload: UpdateHospitalizationProcedurePayload,
  ): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.put<HospitalizationProcedureResponse>(`${BASE}/${id}`, payload)
    return data
  },

  async listByHospitalization(
    hospitalizationId: number,
  ): Promise<HospitalizationProcedureResponse[]> {
    const { data } = await http.get<HospitalizationProcedureResponse[]>(
      `${BASE}/by-hospitalization/${hospitalizationId}`,
    )
    return data
  },

  async remove(id: number): Promise<void> {
    await http.delete(`${BASE}/${id}`)
  },

  /** Suspende el procedimiento (registra suspensionDate/By). */
  async suspend(id: number): Promise<HospitalizationProcedureResponse> {
    const { data } = await http.patch<HospitalizationProcedureResponse>(`${BASE}/${id}/suspend`)
    return data
  },
}

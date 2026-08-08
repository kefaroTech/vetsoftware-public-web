import { http, TRANSFER_TIMEOUT_MS } from '@/services/http/http.client'

export interface CreatePrescriptionPayload {
  date: string
  // El diagnóstico se toma de la consulta (opcional); ya no se escribe en la receta.
  diagnosis: string | null
  observations: string
  animalId: number
  consultationId: number
  companyId: number
}

export interface PrescriptionMedicamentSummary {
  id: number
  name: string
  presentation: string
  quantity: number
  posology: string
  observation: string | null
}

export interface PrescriptionAnimalSummary {
  id: number
  name: string
  code: string
}

export interface PrescriptionConsultationSummary {
  id: number
  date: string
}

export interface PrescriptionCompanySummary {
  id: number
  name: string
  identifier: string
}

export interface PrescriptionResponse {
  id: number
  date: string
  diagnosis: string | null
  observations: string
  animal: PrescriptionAnimalSummary
  consultation: PrescriptionConsultationSummary
  company: PrescriptionCompanySummary
  medicaments: PrescriptionMedicamentSummary[]
  createdDate: string
}

export const prescriptionApi = {
  async create(payload: CreatePrescriptionPayload): Promise<PrescriptionResponse> {
    const { data } = await http.post<PrescriptionResponse>('/prescriptions', payload)
    return data
  },

  async findById(id: number): Promise<PrescriptionResponse> {
    const { data } = await http.get<PrescriptionResponse>(`/prescriptions/${id}`)
    return data
  },

  async exportPdf(id: number): Promise<Blob> {
    const { data } = await http.get<Blob>(`/prescriptions/${id}/export.pdf`, {
      responseType: 'blob',
      timeout: TRANSFER_TIMEOUT_MS,
    })
    return data
  },
}

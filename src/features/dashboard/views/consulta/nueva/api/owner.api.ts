import { http } from '@/services/http/http.client'
import type { PersonType, TaxRegime } from '@/features/facturacion/types/facturacion'
import type { OwnerDocumentType } from '@/features/facturacion/composables/feFiscalChecklist'

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
  // ── Datos fiscales (espejo del Owner del backend; usados por FE > 5 UVT) ──
  documentType?: OwnerDocumentType | null
  personType?: PersonType | null
  verificationDigit?: string | null
  legalName?: string | null
  withholdingAgent?: boolean
  taxRegime?: TaxRegime | null
  /** Código de responsabilidad RUT (p. ej. "R-99-PN"); opcional, backend default. */
  fiscalResponsibility?: string | null
}

export interface CreateOwnerRequest {
  name: string
  email: string
  document: string
  address: string
  phone: string
  cityId: number
  companyId: number
  // Campos fiscales (opcionales en el tipo del front; el backend exige
  // documentType/personType al crear — la captura fiscal vive en FE > 5 UVT y en OwnerForm).
  documentType?: OwnerDocumentType
  personType?: PersonType
  verificationDigit?: string | null
  legalName?: string | null
  withholdingAgent?: boolean
  taxRegime?: TaxRegime | null
  fiscalResponsibility?: string | null
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
      skipGlobalLoader: true,
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

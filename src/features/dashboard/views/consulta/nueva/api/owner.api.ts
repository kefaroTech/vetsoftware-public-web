import { http } from '@/services/http/http.client'
import { DEFAULT_PAGE_SIZE, type PageResponse } from '@/types/pagination'
import type {
  FiscalResponsibility,
  PersonType,
  TaxRegime,
} from '@/features/facturacion/types/facturacion'
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
  // TR-01: se declaraban opcionales «porque la captura fiscal vive en FE > 5 UVT», pero eso
  // describe cuándo los edita la pantalla, no qué devuelve el servidor: las cuatro columnas son
  // NOT NULL, así que la respuesta siempre los trae.
  documentType: OwnerDocumentType
  personType: PersonType
  verificationDigit?: string | null
  legalName?: string | null
  withholdingAgent: boolean
  taxRegime: TaxRegime
  /** Nombre del enum del backend, no el código RUT. Ver FiscalResponsibility. */
  fiscalResponsibility: FiscalResponsibility
}

export interface CreateOwnerRequest {
  name: string
  email: string
  document: string
  address: string
  phone: string
  cityId: number
  // TR-01: `documentType` y `personType` son `@NotNull` en el backend. Estaban declarados
  // opcionales «porque la captura fiscal vive en FE > 5 UVT», con la advertencia escrita en un
  // comentario en vez de en el tipo — así que el compilador dejaba construir una petición que
  // el servidor rechaza con un 400. Ahora son obligatorios, que es lo que el contrato dice.
  documentType: OwnerDocumentType
  personType: PersonType
  verificationDigit?: string | null
  legalName?: string | null
  withholdingAgent?: boolean
  taxRegime?: TaxRegime | null
  fiscalResponsibility?: FiscalResponsibility | null
}

export interface UpdateOwnerRequest extends CreateOwnerRequest {}

export const ownerApi = {
  async create(payload: CreateOwnerRequest): Promise<OwnerResponse> {
    const { data } = await http.post<OwnerResponse>('/owners', payload)
    return data
  },

  /**
   * BE-06: `/owners` devolvía la tabla entera. Ahora es una página; el consumidor decide si la
   * acumula (scroll infinito) o la muestra suelta (tabla con paginador).
   */
  async listPage(
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<OwnerResponse>> {
    const { data } = await http.get<PageResponse<OwnerResponse>>('/owners', {
      params: { page, pageSize },
      signal,
    })
    return data
  },

  async search(
    query: string,
    page = 0,
    pageSize = DEFAULT_PAGE_SIZE,
    signal?: AbortSignal,
  ): Promise<PageResponse<OwnerResponse>> {
    const { data } = await http.get<PageResponse<OwnerResponse>>('/owners/search', {
      params: { q: query, page, pageSize },
      skipGlobalLoader: true,
      signal,
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

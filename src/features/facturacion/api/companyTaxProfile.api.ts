import { http } from '@/services/http/http.client'
import type {
  CompanyTaxProfileResponse,
  SaveCompanyTaxProfileRequest,
} from '../types/facturacion'

export const companyTaxProfileApi = {
  /** Devuelve null si la empresa aún no tiene perfil fiscal (404). */
  async find(): Promise<CompanyTaxProfileResponse | null> {
    try {
      const { data } = await http.get<CompanyTaxProfileResponse>('/company-tax-profile')
      return data
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  },

  async create(payload: SaveCompanyTaxProfileRequest): Promise<CompanyTaxProfileResponse> {
    const { data } = await http.post<CompanyTaxProfileResponse>('/company-tax-profile', payload)
    return data
  },

  async update(payload: SaveCompanyTaxProfileRequest): Promise<CompanyTaxProfileResponse> {
    const { data } = await http.put<CompanyTaxProfileResponse>('/company-tax-profile', payload)
    return data
  },
}

function isNotFound(e: unknown): boolean {
  return !!e && typeof e === 'object' && 'response' in e &&
    (e as { response?: { status?: number } }).response?.status === 404
}

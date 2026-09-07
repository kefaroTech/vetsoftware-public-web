import type { CompanyResponse, UpdateCompanyRequest } from '../types/company.types'
import { http } from '@/services/http/http.client'

export const companyApi = {
  /** Devuelve null si no se puede leer (sin permiso `company.read` o 404). La vista degrada con gracia. */
  async findById(id: number): Promise<CompanyResponse | null> {
    try {
      const { data } = await http.get<CompanyResponse>(`/companies/${id}`)
      return data
    } catch (e) {
      if (isReadable(e)) return null
      throw e
    }
  },

  async update(id: number, payload: UpdateCompanyRequest): Promise<CompanyResponse> {
    const { data } = await http.put<CompanyResponse>(`/companies/${id}`, payload)
    return data
  },
}

function isReadable(e: unknown): boolean {
  if (!e || typeof e !== 'object' || !('response' in e)) return false
  const status = (e as { response?: { status?: number } }).response?.status
  return status === 403 || status === 404
}

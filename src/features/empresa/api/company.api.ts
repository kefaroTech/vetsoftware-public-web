import { http } from '@/services/http/http.client'

/**
 * Datos base de la empresa (no fiscales). GET /companies/{id} está scopeado: el backend exige
 * `company.read` + que el id sea la empresa del JWT (@authz.isMyCompany), así que solo se puede
 * leer la propia empresa. La identidad fiscal (razón social, régimen, NIT/DV) vive aparte en
 * el perfil tributario (`/company-tax-profile`).
 */
export interface CompanyResponse {
  id: number
  name: string
  identifier: string
  address: string | null
  contactNumber: string | null
  city: { id: number; name: string }
  /** TR-01: declaraba un `status` que el resumen del backend no trae; valía `undefined`. */
  membership: { id: number; name: string }
  createdDate: string
  enabled: boolean
}

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
}

function isReadable(e: unknown): boolean {
  if (!e || typeof e !== 'object' || !('response' in e)) return false
  const status = (e as { response?: { status?: number } }).response?.status
  return status === 403 || status === 404
}

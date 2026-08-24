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
  createdDate: string
  enabled: boolean
}

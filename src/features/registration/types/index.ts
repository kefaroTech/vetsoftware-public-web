import type { CompanyDocumentType, TaxRegime } from '@/features/facturacion/types/facturacion'

export interface RegisterUserRequest {
  companyName: string
  documentType: CompanyDocumentType
  companyIdentifier: string
  companyAddress?: string
  companyContactNumber?: string
  cityId: number
  employeeName: string
  employeeEmail: string
  password: string
  taxRegime: TaxRegime
  fiscalEmail: string
  // Token del challenge reCAPTCHA. Solo se envía cuando el captcha está habilitado en el front.
  recaptchaToken?: string
}

// Auto-registro Opción B: NO hay auto-login. La cuenta queda pendiente de verificar el correo.
// El usuario de acceso es el propio correo del administrador.
export interface RegistrationResponse {
  companyId: number
  employeeId: number
  email: string
  status: string
}

export interface Country {
  id: number
  name: string
}

export interface State {
  id: number
  name: string
  country: { id: number; name: string }
}

export interface City {
  id: number
  name: string
  state: { id: number; name: string }
}

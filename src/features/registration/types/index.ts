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
  // Token PUBLICO de la propuesta de IA de la que viene este alta, o ausente si el prospecto
  // llegó por la portada. Es lo único que el cliente tiene: la URL de su propuesta. El backend
  // lo traduce a id y guarda el ID, nunca el token.
  //
  // Tolerante a lo desconocido, y esto importa para el alta: un token caducado, o cuya propuesta
  // ya se llevó la purga de retención, NO tumba el registro. Se pierde la atribución del embudo,
  // que es analítica; no se pierde el cliente. Así que nunca hay que bloquear el envío del
  // formulario por no poder validarlo aquí.
  //
  // 43 caracteres: lo que produce `ProposalToken` y lo que declara `public_token VARCHAR(43)`.
  aiProposalToken?: string
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

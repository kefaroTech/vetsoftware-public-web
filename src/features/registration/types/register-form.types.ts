/**
 * Modelo de vista del formulario de auto-registro. No es contrato: el payload
 * que viaja al backend es `RegisterUserRequest`. Vive aparte porque lo comparten
 * `RegisterForm` y las dos secciones que lo componen.
 */
export type RegisterFieldKey =
  | 'companyIdentifier'
  | 'companyName'
  | 'taxRegime'
  | 'fiscalEmail'
  | 'companyContactNumber'
  | 'countryId'
  | 'stateId'
  | 'cityId'
  | 'employeeName'
  | 'employeeEmail'
  | 'password'

export interface RegisterFormState {
  documentType: string
  companyIdentifier: string
  companyName: string
  taxRegime: string
  fiscalEmail: string
  companyAddress: string
  companyContactNumber: string
  countryId: string
  stateId: string
  cityId: string
  employeeName: string
  employeeEmail: string
  password: string
}

export interface RegisterOption {
  value: string
  label: string
}

/**
 * Orden VISUAL de los campos, explícito.
 *
 * `ErrorSummary` exige el orden del DOM (WCAG §2.4.3) y no lo puede sacar de
 * `Object.keys(errors)`: el orden de claves de un objeto deja de coincidir con
 * la pantalla en cuanto alguien reordena el `computed` que produce los errores,
 * y entonces el resumen manda al usuario a los campos en un orden que no es el
 * que ve. Este array es la única fuente de ese orden, y va junto a la forma del
 * formulario porque es una propiedad de la forma, no del componente.
 */
export const REGISTER_FIELD_DOM_ORDER: readonly RegisterFieldKey[] = [
  'companyIdentifier',
  'companyName',
  'taxRegime',
  'fiscalEmail',
  'companyContactNumber',
  'countryId',
  'stateId',
  'cityId',
  'employeeName',
  'employeeEmail',
  'password',
]

/**
 * id del CONTROL de cada campo. Estables y conocidos ANTES de renderizar: los
 * enlaces de `ErrorSummary` apuntan aquí y `AuthField` los baja al control por
 * el `FieldContext`, así que el `<label for>`, el `aria-describedby` y el ancla
 * del resumen hablan todos del mismo elemento.
 */
export const REGISTER_FIELD_IDS: Readonly<Record<RegisterFieldKey, string>> = {
  companyIdentifier: 'reg-company-identifier',
  companyName: 'reg-company-name',
  taxRegime: 'reg-tax-regime',
  fiscalEmail: 'reg-fiscal-email',
  companyContactNumber: 'reg-company-contact-number',
  countryId: 'reg-country-id',
  stateId: 'reg-state-id',
  cityId: 'reg-city-id',
  employeeName: 'reg-employee-name',
  employeeEmail: 'reg-employee-email',
  password: 'reg-password',
}

/** El widget de reCAPTCHA no es un `AuthField`, pero su fallo sí es una fila
 * más del resumen: si no lo fuera, el encabezado diría «Hay 2 problemas» y en
 * la lista solo habría 2 de los 3 motivos por los que el envío se detuvo. */
export const REGISTER_RECAPTCHA_ID = 'reg-recaptcha'

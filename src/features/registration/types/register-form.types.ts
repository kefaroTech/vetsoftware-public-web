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
 * id del CONTROL de cada campo. Estables y conocidos ANTES de renderizar:
 * `AuthField` los baja al control por el `FieldContext`, así que el
 * `<label for>` y el `aria-describedby` hablan del mismo elemento.
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

/** id del contenedor del widget de reCAPTCHA, destino de `scrollToFirstError`
 * cuando falta la verificación. */
export const REGISTER_RECAPTCHA_ID = 'reg-recaptcha'

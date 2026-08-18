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

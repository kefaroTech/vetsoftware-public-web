import type { TaxRegime } from '@/features/facturacion/types/facturacion'

export interface RegisterUserRequest {
  companyName: string
  companyIdentifier: string
  companyAddress?: string
  companyContactNumber?: string
  cityId: number
  employeeName: string
  employeeEmail: string
  password: string
  taxRegime: TaxRegime
  fiscalEmail: string
}

export interface RegistrationResponse {
  companyId: number
  employeeId: number
  token: string
  tokenType: string
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

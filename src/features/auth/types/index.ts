export interface LoginEmployeeRequest {
  employeeCode: string
  password: string
}

export type AuthSubjectType = 'EMPLOYEE' | 'SYSTEM_USER'

export interface TokenResponse {
  token: string
  type: AuthSubjectType
  refreshToken: string
}

export interface AuthSession {
  token: string
  type: AuthSubjectType
  refreshToken?: string
}

export interface MeResponse {
  id: number
  type: AuthSubjectType
  companyId: number | null
  name: string
  employeeCode: string
  permissions: string[]
}

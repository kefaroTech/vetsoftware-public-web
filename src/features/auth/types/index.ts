export interface LoginEmployeeRequest {
  employeeCode: string
  password: string
}

export type AuthSubjectType = 'EMPLOYEE' | 'SYSTEM_USER'

export interface TokenResponse {
  token: string
  type: AuthSubjectType
}

export interface AuthSession {
  token: string
  type: AuthSubjectType
}

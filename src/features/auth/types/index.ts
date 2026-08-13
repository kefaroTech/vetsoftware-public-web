export interface LoginEmployeeRequest {
  employeeCode: string
  password: string
}

export type AuthSubjectType = 'EMPLOYEE' | 'SYSTEM_USER'

/**
 * El backend ya no entrega el refresh token en el cuerpo: lo emite en una cookie
 * HttpOnly. El campo sigue en el JSON con valor null y se omite aqui a proposito,
 * para que ningun codigo nuevo intente leerlo.
 */
export interface TokenResponse {
  token: string
  type: AuthSubjectType
}

export interface AuthSession {
  token: string
  type: AuthSubjectType
}

export interface MeResponse {
  id: number
  type: AuthSubjectType
  companyId: number | null
  name: string
  // TR-01: null para SYSTEM_USER, que no tiene codigo de empleado. Se declaraba garantizado
  // porque este front solo autentica empleados, pero el tipo describe el endpoint, no el uso
  // que le da una app: el admin lo tenia bien y este no.
  employeeCode: string | null
  // true = debe cambiar la contraseña temporal antes de poder usar el panel (primer login).
  mustChangePassword: boolean
  permissions: string[]
  // Sedes (branch ids) a las que el empleado tiene acceso. Vacío para SYSTEM_USER o admin (el admin no se acota).
  branchIds: number[]
}

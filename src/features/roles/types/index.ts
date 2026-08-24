export type RoleColor = 'amatista' | 'green' | 'blue' | 'amber' | 'gray'

export interface CompanyRef {
  id: number
  name: string
  identifier: string
}

export interface ModuleRef {
  id: number
  name: string
  code: string
}

export interface SubModuleRef {
  id: number
  name: string
  code: string
}

export interface RoleRef {
  id: number
  name: string
  code: string
}

export interface PermissionRef {
  id: number
  name: string
  code: string
}

export interface ModuleResponse {
  id: number
  name: string
  code: string
  /** TR-01: el backend siempre lo devuelve (columna NOT NULL); no era opcional. */
  createdDate: string
}

export interface SubModuleResponse {
  id: number
  name: string
  code: string
  module: ModuleRef
  /** Si el submodulo se puede vender como linea de una suscripcion. */
  sellable: boolean
  /** Si el submodulo admite concederse en modo solo lectura. */
  readOnlyCapable: boolean
  /** TR-01: el backend siempre lo devuelve (columna NOT NULL); no era opcional. */
  createdDate: string
}

export interface PermissionResponse {
  id: number
  name: string
  code: string
  company: CompanyRef
  subModule: SubModuleRef
  /** TR-01: columna NOT NULL; el backend siempre lo devuelve. */
  createdDate: string
}

export interface RolePermissionSummary {
  rolePermissionId: number
  id: number
  name: string
  code: string
}

export interface RoleResponse {
  id: number
  name: string
  code: string
  company: CompanyRef
  permissions: RolePermissionSummary[]
  enabled: boolean
  /** TR-01: columna NOT NULL; el backend siempre lo devuelve. */
  createdDate: string
}

export interface RolePermissionResponse {
  id: number
  role: RoleRef
  permission: PermissionRef
  /** TR-01: columna NOT NULL; el backend siempre lo devuelve. */
  createdDate: string
}

export interface CreateRoleRequest {
  name: string
  code: string
}

export type UpdateRoleRequest = CreateRoleRequest

export interface CreateRolePermissionRequest {
  roleId: number
  permissionId: number
}

export interface SyncRolePermissionsRequest {
  permissionIds: number[]
}

export interface RoleDraft {
  id?: number
  name: string
  code: string
  active: boolean
  permissionIds: Set<number>
}

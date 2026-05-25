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
  createdDate?: string
}

export interface SubModuleResponse {
  id: number
  name: string
  code: string
  module: ModuleRef
  createdDate?: string
}

export interface PermissionResponse {
  id: number
  name: string
  code: string
  company: CompanyRef
  subModule: SubModuleRef
  createdDate?: string
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
  createdDate?: string
}

export interface RolePermissionResponse {
  id: number
  role: RoleRef
  permission: PermissionRef
  createdDate?: string
}

export interface CreateRoleRequest {
  name: string
  code: string
  companyId: number
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

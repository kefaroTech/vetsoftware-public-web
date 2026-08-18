/**
 * Modelo de vista del árbol de permisos del modal de rol. No es contrato: lo
 * arma `EditPermissionsModal` cruzando los catálogos de módulos, sub-módulos y
 * permisos, y lo consume `PermissionTree`.
 */
export interface PermissionSubGroup {
  subModuleId: number
  subModuleName: string
  permissionIds: number[]
}

export interface PermissionModuleGroup {
  moduleId: number
  moduleName: string
  subModules: PermissionSubGroup[]
}

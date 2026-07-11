import { getSelectedBranchId } from '../stores/branch.store'

/**
 * Contexto multi-sucursal para la capa api. La sede seleccionada (persistida) se envía como contexto en las
 * peticiones operativas: como query param en las LISTAS/reportes y en el body de las ESCRITURAS. Cuando la
 * selección es "Todas las sedes" (null) no se añade nada — las listas devuelven todas las sedes y las
 * escrituras caen a la sede Principal por defecto en el backend.
 */

/** Añade `branchId` a los params de una lista/reporte si hay una sede concreta seleccionada. */
export function withBranchParam<T extends Record<string, unknown>>(
  params: T,
): T & { branchId?: number } {
  const id = getSelectedBranchId()
  return id == null ? params : { ...params, branchId: id }
}

/** Añade `branchId` al body de una escritura operativa si hay una sede concreta seleccionada. */
export function withBranchBody<T extends object>(body: T): T & { branchId?: number } {
  const id = getSelectedBranchId()
  return id == null ? body : { ...body, branchId: id }
}

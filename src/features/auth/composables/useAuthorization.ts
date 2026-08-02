import { computed, type ComputedRef } from 'vue'
import { useAuth } from './useAuth'

export function useAuthorization() {
  const { me } = useAuth()
  const permissions = computed<string[]>(() => me.value?.permissions ?? [])
  // Sedes asignadas al empleado (multi-sucursal). El alcance total también se materializa explícitamente.
  const branchIds = computed<number[]>(() => me.value?.branchIds ?? [])

  function canAccessBranch(branchId: number): boolean {
    return branchIds.value.includes(branchId)
  }

  function can(perm: string): ComputedRef<boolean> {
    return computed(() => permissions.value.includes(perm))
  }

  function canAny(...perms: string[]): ComputedRef<boolean> {
    return computed(() => perms.some((p) => permissions.value.includes(p)))
  }

  function canAll(...perms: string[]): ComputedRef<boolean> {
    return computed(() => perms.every((p) => permissions.value.includes(p)))
  }

  function hasPermission(perm: string): boolean {
    return permissions.value.includes(perm)
  }

  return { permissions, branchIds, canAccessBranch, can, canAny, canAll, hasPermission }
}

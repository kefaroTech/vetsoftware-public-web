import { computed, type ComputedRef } from 'vue'
import { useAuth } from './useAuth'
import { PERMISSIONS } from '@/constants/permissions'

export function useAuthorization() {
  const { me } = useAuth()
  const permissions = computed<string[]>(() => me.value?.permissions ?? [])
  const isAdmin = computed(() => permissions.value.includes(PERMISSIONS.ADMIN_ALL))
  // Sedes asignadas al empleado (multi-sucursal). El admin no se acota por sede.
  const branchIds = computed<number[]>(() => me.value?.branchIds ?? [])

  function canAccessBranch(branchId: number): boolean {
    return isAdmin.value || branchIds.value.includes(branchId)
  }

  function can(perm: string): ComputedRef<boolean> {
    return computed(() => isAdmin.value || permissions.value.includes(perm))
  }

  function canAny(...perms: string[]): ComputedRef<boolean> {
    return computed(
      () => isAdmin.value || perms.some((p) => permissions.value.includes(p)),
    )
  }

  function canAll(...perms: string[]): ComputedRef<boolean> {
    return computed(
      () => isAdmin.value || perms.every((p) => permissions.value.includes(p)),
    )
  }

  function hasPermission(perm: string): boolean {
    return isAdmin.value || permissions.value.includes(perm)
  }

  return { permissions, isAdmin, branchIds, canAccessBranch, can, canAny, canAll, hasPermission }
}

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { rolesApi } from '../api/roles.api'
import { rolePermissionsApi } from '../api/rolePermissions.api'
import { useAuth } from '@/features/auth/composables/useAuth'
import type { CreateRoleRequest, RoleResponse, UpdateRoleRequest } from '../types'

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

function makeRoleCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  const suffix = Date.now().toString(36).slice(-4).toUpperCase()
  return base ? `${base}_${suffix}` : `ROLE_${suffix}`
}

export const useRolesStore = defineStore('roles', () => {
  const list = ref<RoleResponse[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let inFlight: Promise<RoleResponse[]> | null = null

  async function load(): Promise<RoleResponse[]> {
    if (inFlight) return inFlight
    inFlight = rolesApi
      .listByCompany()
      .then((data) => {
        list.value = data
        inFlight = null
        return data
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
    return inFlight
  }

  async function refresh() {
    loading.value = true
    error.value = null
    try {
      await load()
    } catch {
      error.value = 'No se pudieron cargar los roles.'
    } finally {
      loading.value = false
    }
  }

  async function forceRefresh() {
    await refresh()
  }

  function isActive(roleId: number): boolean {
    return list.value.find((r) => r.id === roleId)?.enabled ?? true
  }

  async function setActive(roleId: number, active: boolean): Promise<void> {
    if (active) {
      const updated = await rolesApi.reactivate(roleId)
      list.value = list.value.map((r) => (r.id === roleId ? updated : r))
    } else {
      await rolesApi.deactivate(roleId)
      list.value = list.value.map((r) => (r.id === roleId ? { ...r, enabled: false } : r))
    }
  }

  async function createWithPermissions(input: {
    name: string
    permissionIds: number[]
  }): Promise<RoleResponse> {
    const { companyId } = useAuth()
    const cid = companyId.value
    if (cid == null) throw new Error('No hay companyId en sesión')
    const payload: CreateRoleRequest = {
      name: input.name.trim(),
      code: makeRoleCode(input.name),
      companyId: cid,
    }
    const created = await rolesApi.create(payload)
    if (input.permissionIds.length > 0) {
      await rolePermissionsApi.syncByRole(created.id, { permissionIds: input.permissionIds })
    }
    await forceRefresh()
    return created
  }

  async function updateNameAndPermissions(input: {
    role: RoleResponse
    name: string
    nextPermissionIds: Set<number>
    currentPermissionIds: Set<number>
  }): Promise<void> {
    const { role, name, nextPermissionIds, currentPermissionIds } = input
    const trimmedName = name.trim()

    let nameChanged = false
    if (trimmedName !== role.name) {
      const payload: UpdateRoleRequest = {
        name: trimmedName,
        code: role.code,
        companyId: role.company.id,
      }
      await rolesApi.update(role.id, payload)
      nameChanged = true
    }

    const permissionsChanged = !setsEqual(currentPermissionIds, nextPermissionIds)
    if (permissionsChanged) {
      await rolePermissionsApi.syncByRole(role.id, { permissionIds: [...nextPermissionIds] })
    }

    if (nameChanged || permissionsChanged) {
      await forceRefresh()
    }
  }

  async function remove(roleId: number): Promise<void> {
    await rolesApi.remove(roleId)
    list.value = list.value.filter((r) => r.id !== roleId)
  }

  return {
    list,
    loading,
    error,
    isActive,
    setActive,
    refresh,
    forceRefresh,
    createWithPermissions,
    updateNameAndPermissions,
    remove,
  }
})

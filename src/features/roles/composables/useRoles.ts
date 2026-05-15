import { onMounted, ref } from 'vue'
import { rolesApi } from '../api/roles.api'
import { rolePermissionsApi } from '../api/rolePermissions.api'
import { useAuth } from '@/features/auth/composables/useAuth'
import type {
  CreateRoleRequest,
  RoleResponse,
  UpdateRoleRequest,
} from '../types'

const cache = ref<RoleResponse[]>([])
let loaded = false
let inFlight: Promise<RoleResponse[]> | null = null

async function load(): Promise<RoleResponse[]> {
  if (loaded) return cache.value
  if (!inFlight) {
    inFlight = rolesApi
      .listByCompany()
      .then((list) => {
        cache.value = list
        loaded = true
        return list
      })
      .catch((e) => {
        inFlight = null
        throw e
      })
  }
  return inFlight
}

const inactiveIds = ref<Set<number>>(new Set())

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

export function useRoles() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { companyId } = useAuth()

  function isActive(roleId: number): boolean {
    return !inactiveIds.value.has(roleId)
  }

  function setActive(roleId: number, active: boolean) {
    const next = new Set(inactiveIds.value)
    if (active) next.delete(roleId)
    else next.add(roleId)
    inactiveIds.value = next
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
    loaded = false
    inFlight = null
    await refresh()
  }

  async function createWithPermissions(input: {
    name: string
    permissionIds: number[]
  }): Promise<RoleResponse> {
    const cid = companyId.value
    if (cid == null) throw new Error('No hay companyId en sesión')
    const payload: CreateRoleRequest = {
      name: input.name.trim(),
      code: makeRoleCode(input.name),
      companyId: cid,
    }
    const created = await rolesApi.create(payload)
    await Promise.all(
      input.permissionIds.map((pid) =>
        rolePermissionsApi.create({ roleId: created.id, permissionId: pid }),
      ),
    )
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

    const toAdd: number[] = []
    const toRemove: number[] = []
    for (const pid of nextPermissionIds) {
      if (!currentPermissionIds.has(pid)) toAdd.push(pid)
    }
    for (const pid of currentPermissionIds) {
      if (!nextPermissionIds.has(pid)) toRemove.push(pid)
    }

    await Promise.all([
      ...toAdd.map((pid) =>
        rolePermissionsApi.create({ roleId: role.id, permissionId: pid }),
      ),
      ...toRemove
        .map((pid) => role.permissions.find((p) => p.id === pid)?.rolePermissionId)
        .filter((id): id is number => typeof id === 'number')
        .map((id) => rolePermissionsApi.remove(id)),
    ])

    if (nameChanged || toAdd.length > 0 || toRemove.length > 0) {
      await forceRefresh()
    }
  }

  async function remove(roleId: number): Promise<void> {
    await rolesApi.remove(roleId)
    cache.value = cache.value.filter((r) => r.id !== roleId)
  }

  onMounted(() => {
    if (!loaded) refresh()
  })

  return {
    list: cache,
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
}

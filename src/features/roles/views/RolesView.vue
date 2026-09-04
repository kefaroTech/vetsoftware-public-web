<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import RoleCard from '../components/RoleCard.vue'
import AddRoleCard from '../components/AddRoleCard.vue'
import EditPermissionsModal from '../components/EditPermissionsModal.vue'
import { useRoles } from '../composables/useRoles'
import { usePermissionsCatalog } from '../composables/usePermissionsCatalog'
import { useSubModulesCatalog } from '../composables/useSubModulesCatalog'
import { useModulesCatalog } from '../composables/useModulesCatalog'
import { pickRoleColor } from '../constants/roleColors'
import type { RoleResponse, SubModuleResponse } from '../types'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage } from '@/services/http/http.client'

useModulesCatalog()
const subModules = useSubModulesCatalog()
const permissionsCatalog = usePermissionsCatalog()
const roles = useRoles()
const { can } = useAuthorization()
const toast = useToast()
const { confirm } = useConfirmDialog()
const canCreateRole = can(PERMISSIONS.ROLE_PERMISSIONS_CREATE)
const canUpdateRole = can(PERMISSIONS.ROLE_PERMISSIONS_UPDATE)

const modalOpen = ref(false)
const editingRole = ref<RoleResponse | null>(null)
const busy = ref(false)

function isSystemRole(role: RoleResponse): boolean {
  return role.code === 'ADMIN'
}

const editingReadOnly = computed(() => {
  if (!canUpdateRole.value) return true
  return editingRole.value !== null && isSystemRole(editingRole.value)
})

function openCreate() {
  editingRole.value = null
  modalOpen.value = true
}

function openEdit(role: RoleResponse) {
  editingRole.value = role
  modalOpen.value = true
}

function close() {
  modalOpen.value = false
  editingRole.value = null
}

function onSaved() {
  const wasEditing = editingRole.value
  if (wasEditing) {
    toast.success('Rol actualizado', 'Los cambios se guardaron.')
  } else {
    // Resolver el rol recién creado (es el más reciente con ese nombre, pero
    // como no tenemos referencia directa, mostramos un copy genérico).
    toast.success('Rol creado', 'El rol ya está disponible.')
  }
  close()
}

async function onToggleActive(role: RoleResponse, active: boolean) {
  if (isSystemRole(role) || !canUpdateRole.value) return
  if (!active) {
    void askDeactivate(role)
    return
  }
  try {
    await roles.setActive(role.id, true)
    toast.info('Rol activado', `${role.name} vuelve a estar disponible.`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo activar el rol')
    toast.error('Ocurrió un error', msg)
  }
}

/**
 * Desactivar pasa por el único diálogo de confirmación de la app; la acción
 * viaja dentro, así que el diálogo se queda abierto e inerte mientras el PATCH
 * está en vuelo y el `busy` de la vista sigue gobernando el resto de la pantalla.
 */
async function askDeactivate(role: RoleResponse) {
  if (busy.value) return
  try {
    const ok = await confirm({
      title: `¿Desactivar ${role.name}?`,
      message:
        'Los empleados con este rol dejarán de tener los permisos asociados hasta que vuelvas a activarlo. La configuración del rol y sus permisos se mantienen intactos.',
      confirmLabel: 'Desactivar',
      busyLabel: 'Desactivando…',
      width: 460,
      action: async () => {
        busy.value = true
        try {
          await roles.setActive(role.id, false)
        } finally {
          busy.value = false
        }
      },
    })
    if (!ok) return
    toast.info('Rol desactivado', `${role.name} dejó de estar disponible.`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo desactivar el rol')
    toast.error('Ocurrió un error', msg)
  }
}

function subModulesUsedByRole(role: RoleResponse): SubModuleResponse[] {
  const subIds = new Set<number>()
  for (const rp of role.permissions) {
    const p = permissionsCatalog.byId.value.get(rp.id)
    if (p) subIds.add(p.subModule.id)
  }
  const result: SubModuleResponse[] = []
  for (const id of subIds) {
    const sub = subModules.byId.value.get(id)
    if (sub) result.push(sub)
  }
  return result.sort((a, b) => a.name.localeCompare(b.name))
}

const totalCatalogPermissions = computed(() => permissionsCatalog.list.value.length)
const orderedRoles = computed(() =>
  [...roles.list.value].sort((a, b) => a.name.localeCompare(b.name)),
)
const isLoading = computed(() => roles.loading.value || permissionsCatalog.loading.value)
const hasError = computed(() => roles.error.value ?? permissionsCatalog.error.value)
</script>

<template>
  <section class="roles-page ds-stack">
    <PageHeader
      kicker="Administración · Acceso"
      title="Roles y permisos"
      lead="Definí qué puede hacer cada miembro del equipo. Agrupá permisos por sub-módulo y mantené el control fino sobre quién accede a qué."
    >
      <template #action>
        <button
          v-if="canCreateRole"
          type="button"
          class="create-btn ds-btn ds-btn--primary ds-btn--elevated"
          @click="openCreate"
        >
          <Plus :size="16" :stroke-width="1.8" />
          <span>Crear rol</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="hasError" class="ds-banner ds-banner--error" role="alert">{{ hasError }}</div>

    <div class="grid">
      <AddRoleCard v-if="canCreateRole" @click="openCreate" />
      <RoleCard
        v-for="role in orderedRoles"
        :key="role.id"
        :role="role"
        :active="roles.isActive(role.id)"
        :color="pickRoleColor(role)"
        :permission-count="role.permissions.length"
        :sub-modules="subModulesUsedByRole(role)"
        :total-catalog-permissions="totalCatalogPermissions"
        :read-only="isSystemRole(role) || !canUpdateRole"
        @toggle-active="(v: boolean) => onToggleActive(role, v)"
        @edit="openEdit(role)"
      />
      <!-- EST-01: la rama de error va ANTES que la de vacío; sin `!hasError` la
           pantalla que falló afirma que no hay roles creados. -->
      <div
        v-if="!hasError && orderedRoles.length === 0 && !isLoading"
        class="empty ds-grid-span ds-empty"
      >
        Aún no hay roles creados. Empezá con "Crear rol".
      </div>
    </div>

    <EditPermissionsModal
      :open="modalOpen"
      :role="editingRole"
      :color="editingRole ? pickRoleColor(editingRole) : 'amatista'"
      :read-only="editingReadOnly"
      @close="close"
      @saved="onSaved"
    />
  </section>
</template>

<style scoped>
.roles-page {
  gap: 24px;
  max-width: 1320px;
  margin: 0 auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}

.empty {
  padding: 28px;
  background: var(--warm-50);
  border: 1px dashed var(--warm-300);
  border-radius: 12px;
  font-size: 13px;
}

@media (width <= 768px) {
  .create-btn {
    align-self: flex-start;
  }
}
</style>

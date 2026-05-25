<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import RoleCard from '../components/RoleCard.vue'
import AddRoleCard from '../components/AddRoleCard.vue'
import EditPermissionsModal from '../components/EditPermissionsModal.vue'
import ConfirmDeactivateRoleDialog from '../components/ConfirmDeactivateRoleDialog.vue'
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
import { getProblemDetailMessage } from '@/services/http/http.client'

useModulesCatalog()
const subModules = useSubModulesCatalog()
const permissionsCatalog = usePermissionsCatalog()
const roles = useRoles()
const { can } = useAuthorization()
const toast = useToast()
const canCreateRole = can(PERMISSIONS.ROLE_PERMISSIONS_CREATE)
const canUpdateRole = can(PERMISSIONS.ROLE_PERMISSIONS_UPDATE)

const modalOpen = ref(false)
const editingRole = ref<RoleResponse | null>(null)
const deactivateTarget = ref<RoleResponse | null>(null)
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
    deactivateTarget.value = role
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

async function confirmDeactivate() {
  const target = deactivateTarget.value
  if (!target || busy.value) return
  busy.value = true
  try {
    await roles.setActive(target.id, false)
    toast.info('Rol desactivado', `${target.name} dejó de estar disponible.`)
    deactivateTarget.value = null
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo desactivar el rol')
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
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
const isLoading = computed(
  () => roles.loading.value || permissionsCatalog.loading.value,
)
const hasError = computed(
  () => roles.error.value ?? permissionsCatalog.error.value,
)
</script>

<template>
  <section class="roles-page">
    <PageHeader
      kicker="Administración · Acceso"
      title="Roles y permisos"
      lead="Definí qué puede hacer cada miembro del equipo. Agrupá permisos por sub-módulo y mantené el control fino sobre quién accede a qué."
    >
      <template #action>
        <button
          v-if="canCreateRole"
          type="button"
          class="create-btn"
          @click="openCreate"
        >
          <Plus :size="16" :stroke-width="1.8" />
          <span>Crear rol</span>
        </button>
      </template>
    </PageHeader>

    <div v-if="hasError" class="banner-error">{{ hasError }}</div>

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
      <div
        v-if="orderedRoles.length === 0 && !isLoading"
        class="empty"
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

    <ConfirmDeactivateRoleDialog
      :open="deactivateTarget !== null"
      :role="deactivateTarget"
      :busy="busy"
      @cancel="deactivateTarget = null"
      @confirm="confirmDeactivate"
    />
  </section>
</template>

<style scoped>
.roles-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1320px;
  margin: 0 auto;
}
.create-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: #fff;
  border: none;
  border-radius: 9px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  transition: filter 0.12s ease;
}
.create-btn:hover {
  filter: brightness(1.05);
}
.banner-error {
  background: oklch(96% 0.04 25);
  border: 1px solid oklch(85% 0.06 25);
  color: oklch(40% 0.16 25);
  border-radius: 9px;
  padding: 10px 14px;
  font-size: 13px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 14px;
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 28px;
  background: var(--warm-50);
  border: 1px dashed var(--warm-300);
  border-radius: 12px;
  color: var(--warm-500);
  font-size: 13px;
}

@media (max-width: 768px) {
  .create-btn {
    align-self: flex-start;
  }
}
</style>

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

useModulesCatalog()
const subModules = useSubModulesCatalog()
const permissionsCatalog = usePermissionsCatalog()
const roles = useRoles()
const { can } = useAuthorization()
const canCreateRole = can(PERMISSIONS.ROLE_PERMISSIONS_CREATE)

const modalOpen = ref(false)
const editingRole = ref<RoleResponse | null>(null)

function isSystemRole(role: RoleResponse): boolean {
  return role.code === 'ADMIN'
}

const editingReadOnly = computed(
  () => editingRole.value !== null && isSystemRole(editingRole.value),
)

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
    <header class="page-head">
      <div class="kicker">Administración · Acceso</div>
      <div class="title-row">
        <div>
          <h1 class="title">Roles y permisos</h1>
          <p class="subtitle">
            Definí qué puede hacer cada miembro del equipo. Agrupá permisos por sub-módulo
            y mantené el control fino sobre quién accede a qué.
          </p>
        </div>
        <button
          v-if="canCreateRole"
          type="button"
          class="create-btn"
          @click="openCreate"
        >
          <Plus :size="16" :stroke-width="1.8" />
          <span>Crear rol</span>
        </button>
      </div>
    </header>

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
        :read-only="isSystemRole(role)"
        @toggle-active="(v) => isSystemRole(role) ? null : roles.setActive(role.id, v)"
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
      @saved="close"
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
.page-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
}
.title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.1;
}
.subtitle {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: var(--warm-600);
  max-width: 540px;
  line-height: 1.5;
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
  .title {
    font-size: 28px;
  }
  .subtitle {
    font-size: 13px;
  }
  .title-row {
    flex-direction: column;
    align-items: stretch;
  }
  .create-btn {
    align-self: flex-start;
  }
}
</style>

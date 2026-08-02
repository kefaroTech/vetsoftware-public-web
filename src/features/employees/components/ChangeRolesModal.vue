<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ShieldCheck, AlertCircle, Bell, Plus, Minus } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import type { RoleResponse } from '@/features/roles/types'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import EmployeeAvatar from './EmployeeAvatar.vue'
import RolePill from './RolePill.vue'
import RoleSelectorGrid from './RoleSelectorGrid.vue'

export interface ChangeRolesConfirm {
  addIds: number[]
  removeEmployeeRoleIds: number[]
  selectedRoles: RoleResponse[]
}

const props = defineProps<{
  open: boolean
  employee: Employee | null
  availableRoles: RoleResponse[]
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [data: ChangeRolesConfirm]
}>()

const selectedRoleIds = ref<Set<number>>(new Set())

watch(
  () => [props.open, props.employee?.id] as const,
  ([open]) => {
    if (open && props.employee) {
      selectedRoleIds.value = new Set(props.employee.roles.map((r) => r.id))
    }
  },
  { immediate: true },
)

const currentIds = computed(() => new Set((props.employee?.roles ?? []).map((r) => r.id)))

const addIds = computed(() => [...selectedRoleIds.value].filter((id) => !currentIds.value.has(id)))

const removeRoleIds = computed(() =>
  [...currentIds.value].filter((id) => !selectedRoleIds.value.has(id)),
)

const removeEmployeeRoleIds = computed(() => {
  const map = new Map((props.employee?.roles ?? []).map((r) => [r.id, r.employeeRoleId]))
  return removeRoleIds.value
    .map((rid) => map.get(rid))
    .filter((id): id is number => typeof id === 'number')
})

const hasChanges = computed(() => addIds.value.length > 0 || removeRoleIds.value.length > 0)
const hasAtLeastOne = computed(() => selectedRoleIds.value.size > 0)
const canSave = computed(() => hasChanges.value && hasAtLeastOne.value && !props.busy)

const addNames = computed(() =>
  addIds.value
    .map((id) => props.availableRoles.find((r) => r.id === id)?.name)
    .filter((n): n is string => typeof n === 'string'),
)
const removeNames = computed(() =>
  removeRoleIds.value
    .map(
      (id) =>
        props.employee?.roles.find((r) => r.id === id)?.name ??
        props.availableRoles.find((r) => r.id === id)?.name,
    )
    .filter((n): n is string => typeof n === 'string'),
)

const selectedRoles = computed(() =>
  props.availableRoles.filter((r) => selectedRoleIds.value.has(r.id)),
)

const subtitle = computed(() =>
  props.employee ? `Modificar los roles asignados a ${props.employee.name}` : '',
)

function onSelectedIdsUpdate(next: Set<number>) {
  selectedRoleIds.value = next
}

function onSave() {
  if (!canSave.value) return
  emit('confirm', {
    addIds: addIds.value,
    removeEmployeeRoleIds: removeEmployeeRoleIds.value,
    selectedRoles: selectedRoles.value,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="ShieldCheck"
    title="Cambiar roles"
    :subtitle="subtitle"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="employee" class="body">
        <div class="identity">
          <EmployeeAvatar
            :initials="employee.initials"
            :size="48"
            :active="employee.enabled"
            :role-code="employee.roles[0]?.code ?? ''"
          />
          <div class="identity-info">
            <div class="identity-name">{{ employee.name }}</div>
            <div class="identity-meta">{{ employee.employeeCode }} · {{ employee.email }}</div>
          </div>
        </div>

        <section class="section">
          <div class="section-head">
            <span class="label">Roles actuales</span>
            <span class="counter">{{ employee.roles.length }} roles</span>
          </div>
          <div v-if="employee.roles.length > 0" class="current-pills">
            <RolePill
              v-for="r in employee.roles"
              :key="r.id"
              :name="r.name"
              :code="r.code"
              size="lg"
            />
          </div>
          <div v-else class="no-current">Sin rol asignado</div>
        </section>

        <section class="section">
          <div class="section-head">
            <span class="label">Asignar roles</span>
            <span class="counter">{{ selectedRoleIds.size }} seleccionados</span>
          </div>
          <p class="hint">Un empleado puede tener varios roles. Debe tener al menos uno.</p>
          <RoleSelectorGrid
            :available-roles="availableRoles"
            :selected-ids="selectedRoleIds"
            :current-role-ids="currentIds"
            @update:selected-ids="onSelectedIdsUpdate"
          />
        </section>

        <div v-if="!hasAtLeastOne" class="banner error">
          <AlertCircle :size="14" :stroke-width="1.8" />
          <span>Un empleado no puede quedarse sin rol. Selecciona al menos uno.</span>
        </div>

        <div v-else-if="hasChanges" class="banner warn">
          <div class="banner-head">
            <Bell :size="14" :stroke-width="1.8" />
            <span>Resumen de cambios</span>
          </div>
          <ul class="diff-list">
            <li v-if="addNames.length > 0" class="diff-add">
              <Plus :size="12" :stroke-width="2" />
              <span>Añade: {{ addNames.join(', ') }}</span>
            </li>
            <li v-if="removeNames.length > 0" class="diff-remove">
              <Minus :size="12" :stroke-width="2" />
              <span>Quita: {{ removeNames.join(', ') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ghost" :disabled="busy" @click="emit('close')">Cancelar</button>
      <button type="button" class="primary" :disabled="!canSave" @click="onSave">
        {{ busy ? 'Guardando…' : 'Guardar cambios' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-100);
  border-radius: 11px;
}

.identity-info {
  min-width: 0;
  flex: 1;
}

.identity-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}

.identity-meta {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 2px;
  word-break: break-all;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.label {
  font-size: 11.5px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--warm-500);
  font-weight: 500;
}

.counter {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--warm-100);
  color: var(--warm-600);
  font-weight: 500;
}

.current-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.no-current {
  font-size: 12.5px;
  color: var(--warm-500);
  font-style: italic;
}

.hint {
  margin: 0;
  font-size: 12px;
  color: var(--warm-600);
}

.banner {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
}

.banner.error {
  flex-direction: row;
  align-items: center;
  background: oklch(95% 0.06 25deg);
  border: 1px solid oklch(85% 0.12 25deg);
  color: oklch(40% 0.18 25deg);
}

.banner.warn {
  background: oklch(95% 0.05 80deg);
  border: 1px solid oklch(85% 0.08 80deg);
  color: oklch(35% 0.1 80deg);
}

.banner-head {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.diff-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.diff-list li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}

.diff-add {
  color: oklch(45% 0.13 145deg);
}

.diff-remove {
  color: oklch(48% 0.18 25deg);
}

.ghost,
.primary {
  padding: 8px 14px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
  border: 1px solid transparent;
}

.ghost {
  background: var(--warm-50);
  color: var(--warm-700);
  border-color: var(--warm-200);
}

.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}

.primary {
  background: var(--amatista-700);
  color: white;
}

.primary:hover:not(:disabled) {
  background: var(--amatista-800);
}

.ghost:disabled,
.primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
</style>

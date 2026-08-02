<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Building2, AlertCircle, Bell, Plus, Minus } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import type { BranchResponse } from '@/features/branches/api/branch.api'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import EmployeeAvatar from './EmployeeAvatar.vue'
import BranchSelectorGrid from './BranchSelectorGrid.vue'
import { employeeBranchesApi } from '../api/employeeBranches.api'
import { getProblemDetailMessage } from '@/services/http/http.client'

export interface ChangeBranchesConfirm {
  branchIds: number[]
}

const props = defineProps<{
  open: boolean
  employee: Employee | null
  availableBranches: BranchResponse[]
  busy?: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: [data: ChangeBranchesConfirm]
}>()

const currentBranchIds = ref<Set<number>>(new Set())
const selectedBranchIds = ref<Set<number>>(new Set())
const loadingCurrent = ref(false)
const loadError = ref<string | null>(null)

const activeBranches = computed(() => props.availableBranches.filter((b) => b.active))

// Al abrir, se cargan las sedes actuales del empleado (no vienen en el objeto Employee).
watch(
  () => [props.open, props.employee?.id] as const,
  async ([open]) => {
    if (!open || !props.employee) return
    loadingCurrent.value = true
    loadError.value = null
    try {
      const res = await employeeBranchesApi.get(props.employee.id)
      currentBranchIds.value = new Set(res.branchIds)
      selectedBranchIds.value = new Set(res.branchIds)
    } catch (e) {
      loadError.value = getProblemDetailMessage(e, 'No se pudieron cargar las sedes del empleado')
      currentBranchIds.value = new Set()
      selectedBranchIds.value = new Set()
    } finally {
      loadingCurrent.value = false
    }
  },
  { immediate: true },
)

const addIds = computed(() =>
  [...selectedBranchIds.value].filter((id) => !currentBranchIds.value.has(id)),
)
const removeIds = computed(() =>
  [...currentBranchIds.value].filter((id) => !selectedBranchIds.value.has(id)),
)

const hasChanges = computed(() => addIds.value.length > 0 || removeIds.value.length > 0)
const hasAtLeastOne = computed(() => selectedBranchIds.value.size > 0)
const allSelected = computed(
  () =>
    activeBranches.value.length > 0 &&
    activeBranches.value.every((b) => selectedBranchIds.value.has(b.id)),
)
const canSave = computed(
  () => hasChanges.value && hasAtLeastOne.value && !props.busy && !loadingCurrent.value,
)

function branchName(id: number): string | undefined {
  return props.availableBranches.find((b) => b.id === id)?.name
}
const addNames = computed(() =>
  addIds.value.map(branchName).filter((n): n is string => typeof n === 'string'),
)
const removeNames = computed(() =>
  removeIds.value.map(branchName).filter((n): n is string => typeof n === 'string'),
)

const currentBranches = computed(() =>
  props.availableBranches.filter((b) => currentBranchIds.value.has(b.id)),
)

const subtitle = computed(() =>
  props.employee ? `Sedes en las que ${props.employee.name} puede operar` : '',
)

function onSelectedIdsUpdate(next: Set<number>) {
  selectedBranchIds.value = next
}

function selectAll() {
  selectedBranchIds.value = new Set(activeBranches.value.map((b) => b.id))
}

function onSave() {
  if (!canSave.value) return
  emit('confirm', { branchIds: [...selectedBranchIds.value] })
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Building2"
    title="Cambiar sedes"
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

        <div v-if="loadError" class="banner error">
          <AlertCircle :size="14" :stroke-width="1.8" />
          <span>{{ loadError }}</span>
        </div>

        <section class="section">
          <div class="section-head">
            <span class="label">Sedes actuales</span>
            <span class="counter">{{ currentBranchIds.size }} sedes</span>
          </div>
          <div v-if="loadingCurrent" class="no-current">Cargando…</div>
          <div v-else-if="currentBranches.length > 0" class="current-pills">
            <span v-for="b in currentBranches" :key="b.id" class="branch-pill">{{ b.name }}</span>
          </div>
          <div v-else class="no-current">Sin sedes asignadas</div>
        </section>

        <section class="section">
          <div class="section-head">
            <span class="label">Asignar sedes</span>
            <div class="head-actions">
              <button
                type="button"
                class="link-btn"
                :disabled="allSelected || activeBranches.length === 0"
                @click="selectAll"
              >
                Seleccionar todas
              </button>
              <span class="counter">{{ selectedBranchIds.size }} seleccionadas</span>
            </div>
          </div>
          <p class="hint">Un empleado opera solo en sus sedes. Debe tener al menos una.</p>
          <BranchSelectorGrid
            :available-branches="availableBranches"
            :selected-ids="selectedBranchIds"
            :current-branch-ids="currentBranchIds"
            @update:selected-ids="onSelectedIdsUpdate"
          />
        </section>

        <div v-if="!hasAtLeastOne" class="banner error">
          <AlertCircle :size="14" :stroke-width="1.8" />
          <span>Un empleado no puede quedarse sin sede. Selecciona al menos una.</span>
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

.head-actions {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  color: var(--amatista-700);
  cursor: pointer;
}

.link-btn:disabled {
  color: var(--warm-400);
  cursor: not-allowed;
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

.branch-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--amatista-50);
  color: var(--amatista-800, oklch(35% 0.12 300deg));
  border: 1px solid var(--amatista-200, oklch(88% 0.05 300deg));
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

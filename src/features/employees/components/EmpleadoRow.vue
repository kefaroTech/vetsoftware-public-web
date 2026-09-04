<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import EmployeeAvatar from './EmployeeAvatar.vue'
import RolePill from './RolePill.vue'
import StatusPill from './StatusPill.vue'

const props = defineProps<{
  employee: Employee
  selected: boolean
  zebra: boolean
}>()

defineEmits<{
  select: [id: number]
}>()

const MAX_VISIBLE_BRANCHES = 2
const visibleBranches = computed(() => props.employee.branches.slice(0, MAX_VISIBLE_BRANCHES))
const hiddenCount = computed(() =>
  Math.max(0, props.employee.branches.length - MAX_VISIBLE_BRANCHES),
)
const branchNames = computed(() => props.employee.branches.map((b) => b.name).join(', '))
</script>

<template>
  <button
    type="button"
    class="row"
    :class="{ selected, zebra, inactive: !employee.enabled }"
    @click="$emit('select', employee.id)"
  >
    <div class="cell avatar-cell">
      <EmployeeAvatar
        :initials="employee.initials"
        :size="36"
        :active="employee.enabled"
        :role-code="employee.roles[0]?.code ?? ''"
      />
    </div>
    <div class="cell name-cell">
      <div class="ds-item-label ds-item-label--lg ds-truncate">{{ employee.name }}</div>
      <div class="sub ds-meta">{{ employee.employeeCode }}</div>
    </div>
    <div class="cell role-cell">
      <div v-if="employee.roles.length > 0" class="pills">
        <RolePill v-for="r in employee.roles" :key="r.id" :name="r.name" :code="r.code" />
      </div>
      <span v-else class="no-role ds-meta">Sin rol</span>
    </div>
    <div class="cell sedes-cell">
      <div v-if="employee.branches.length > 0" class="sedes" :title="branchNames">
        <span v-for="b in visibleBranches" :key="b.id" class="sede-chip ds-truncate">{{
          b.name
        }}</span>
        <span v-if="hiddenCount > 0" class="sede-more ds-hint">+{{ hiddenCount }}</span>
      </div>
      <span v-else class="no-sede ds-meta">Sin sede</span>
    </div>
    <div class="cell contact-cell">
      <div class="email ds-truncate ds-meta-dark ds-meta-dark--sm">{{ employee.email }}</div>
    </div>
    <div class="cell status-cell">
      <StatusPill :active="employee.enabled" :invited="employee.status === 'INVITED'" />
    </div>
    <div class="cell chev-cell">
      <ChevronRight :size="16" :stroke-width="1.6" />
    </div>
  </button>
</template>

<style scoped>
.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 15px 12px 18px;
  border-bottom: 1px solid var(--warm-150);
  background: transparent;
  border-left: 3px solid transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  border-top: none;
  border-right: none;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.row:last-child {
  border-bottom: none;
}

.row.zebra {
  background: var(--warm-100);
}

.row:hover:not(.selected) {
  background: var(--warm-100);
}

.row.selected {
  background: var(--amatista-50);
  border-left-color: var(--amatista-600);
}

.row.inactive {
  opacity: 0.7;
}

.cell {
  min-width: 0;
}

.avatar-cell {
  flex: 0 0 36px;
}

.name-cell {
  flex: 1.8;
}

.role-cell {
  flex: 1.2;
}

.sedes-cell {
  flex: 1.4;
}

.contact-cell {
  flex: 1.4;
}

.status-cell {
  flex: 0 0 96px;
}

.chev-cell {
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  color: var(--warm-400);
}

.sub {
  margin-top: 2px;
}

/* `.email` es `.ds-meta-dark` + `--sm`; el par «sin rol»/«sin sede» es
   `.ds-meta`; el chip de sede recorta con `.ds-truncate` y el «+N» es
   `.ds-hint`. `.row:hover` NO migra a `.ds-row-hover`: pesa (0,2,0) y
   perdería contra `.row.zebra` (0,3,0), que hoy sí pierde contra el hover. */
.pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.no-role,
.no-sede {
  font-style: italic;
}

.sedes {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}

.sede-chip {
  max-width: 100%;
  padding: 2px 8px;
  font-size: 11.5px;
  color: var(--warm-700);
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: var(--radius-pill);
}

.sede-more {
  font-weight: 500;
}
</style>

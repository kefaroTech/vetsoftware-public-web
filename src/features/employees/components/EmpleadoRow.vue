<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import EmployeeAvatar from './EmployeeAvatar.vue'
import RolePill from './RolePill.vue'
import StatusPill from './StatusPill.vue'

defineProps<{
  employee: Employee
  selected: boolean
  zebra: boolean
}>()

defineEmits<{
  select: [id: number]
}>()
</script>

<template>
  <button
    type="button"
    class="row"
    :class="{ selected, zebra, inactive: employee.status === 'INACTIVE' }"
    @click="$emit('select', employee.id)"
  >
    <div class="cell avatar-cell">
      <EmployeeAvatar
        :initials="employee.initials"
        :size="36"
        :active="employee.status === 'ACTIVE'"
        :role-code="employee.roles[0]?.code ?? ''"
      />
    </div>
    <div class="cell name-cell">
      <div class="name">{{ employee.name }}</div>
      <div class="sub">{{ employee.employeeCode }}</div>
    </div>
    <div class="cell role-cell">
      <div v-if="employee.roles.length > 0" class="pills">
        <RolePill v-for="r in employee.roles" :key="r.id" :name="r.name" :code="r.code" />
      </div>
      <span v-else class="no-role">Sin rol</span>
    </div>
    <div class="cell contact-cell">
      <div class="email">{{ employee.email }}</div>
    </div>
    <div class="cell status-cell">
      <StatusPill :active="employee.status === 'ACTIVE'" />
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
  padding: 14px 16px 14px 18px;
  border-bottom: 1px solid var(--warm-150);
  background: transparent;
  border-left: 3px solid transparent;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  border-top: none;
  border-right: none;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.row:last-child {
  border-bottom: none;
}
.row.zebra {
  background: oklch(98% 0.005 60);
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
  flex: 2;
}
.role-cell {
  flex: 1.4;
}
.contact-cell {
  flex: 1.6;
}
.status-cell {
  flex: 0 0 100px;
}
.chev-cell {
  flex: 0 0 28px;
  display: grid;
  place-items: center;
  color: var(--warm-400);
}
.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 2px;
}
.email {
  font-size: 12.5px;
  color: var(--warm-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pills {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.no-role {
  font-size: 12px;
  color: var(--warm-500);
  font-style: italic;
}
</style>

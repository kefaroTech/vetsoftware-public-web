<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import type { RoleResponse } from '@/features/roles/types'
import { colorsForCode, findKnownRole } from '../constants/employee-roles'

const props = withDefaults(
  defineProps<{
    availableRoles: RoleResponse[]
    selectedIds: Set<number>
    currentRoleIds?: Set<number>
  }>(),
  { currentRoleIds: () => new Set<number>() },
)

const emit = defineEmits<{
  'update:selectedIds': [ids: Set<number>]
}>()

function toggle(roleId: number) {
  const next = new Set(props.selectedIds)
  if (next.has(roleId)) next.delete(roleId)
  else next.add(roleId)
  emit('update:selectedIds', next)
}

const orderedRoles = computed(() =>
  [...props.availableRoles]
    .filter((r) => r.enabled)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <button
      v-for="role in orderedRoles"
      :key="role.id"
      type="button"
      class="option ds-flex-row ds-flex-row--12"
      :class="{ selected: selectedIds.has(role.id) }"
      @click="toggle(role.id)"
    >
      <span class="checkbox" :class="{ checked: selectedIds.has(role.id) }">
        <Check v-if="selectedIds.has(role.id)" :size="12" :stroke-width="2.5" />
      </span>
      <span class="dot" :style="{ background: colorsForCode(role.code).dot }" />
      <span class="info ds-stack ds-flex-fill">
        <span class="name-row">
          <span class="ds-text-strong ds-text-strong--md">{{ role.name }}</span>
          <span v-if="currentRoleIds.has(role.id)" class="badge-actual">actual</span>
        </span>
        <span v-if="findKnownRole(role.code)?.description" class="desc">
          {{ findKnownRole(role.code)?.description }}
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.option {
  padding: 14px 16px;
  border: 1.5px solid var(--warm-200);
  border-radius: 11px;
  background: var(--warm-50);
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.option:hover:not(.selected) {
  border-color: var(--amatista-300);
}

.option.selected {
  border-color: var(--amatista-600);
  background: linear-gradient(135deg, var(--amatista-50) 0%, oklch(98% 0.01 var(--hue)) 100%);
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--warm-300);
  background: var(--warm-50);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: white;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.checkbox.checked {
  background: var(--amatista-700);
  border-color: var(--amatista-700);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.info {
  gap: 3px;
}

.name-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-actual {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--warm-200);
  color: var(--warm-700);
}

.desc {
  font-size: 12px;
  color: var(--warm-600);
  line-height: 1.4;
}
</style>

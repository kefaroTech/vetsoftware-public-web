<script setup lang="ts">
import { computed } from 'vue'
import { Check, Building2 } from 'lucide-vue-next'
import type { BranchResponse } from '@/features/branches/types/branch.types'

const props = withDefaults(
  defineProps<{
    availableBranches: BranchResponse[]
    selectedIds: Set<number>
    currentBranchIds?: Set<number>
  }>(),
  { currentBranchIds: () => new Set<number>() },
)

const emit = defineEmits<{
  'update:selectedIds': [ids: Set<number>]
}>()

function toggle(branchId: number) {
  const next = new Set(props.selectedIds)
  if (next.has(branchId)) next.delete(branchId)
  else next.add(branchId)
  emit('update:selectedIds', next)
}

// Solo sedes activas, ordenadas por nombre. Una sede inactiva no se puede asignar como contexto operativo.
const orderedBranches = computed(() =>
  [...props.availableBranches]
    .filter((b) => b.active)
    .sort((a, b) => a.name.localeCompare(b.name, 'es')),
)
</script>

<template>
  <div class="ds-stack ds-stack--8">
    <button
      v-for="branch in orderedBranches"
      :key="branch.id"
      type="button"
      class="option ds-flex-row ds-flex-row--12"
      :class="{ selected: selectedIds.has(branch.id) }"
      @click="toggle(branch.id)"
    >
      <span class="checkbox" :class="{ checked: selectedIds.has(branch.id) }">
        <Check v-if="selectedIds.has(branch.id)" :size="12" :stroke-width="2.5" />
      </span>
      <Building2 class="ico" :size="16" :stroke-width="1.7" />
      <span class="info ds-stack ds-flex-fill">
        <span class="name-row">
          <span class="ds-text-strong ds-text-strong--md">{{ branch.name }}</span>
          <span v-if="currentBranchIds.has(branch.id)" class="badge-actual">actual</span>
        </span>
        <span v-if="branch.city?.name" class="desc">{{ branch.city.name }}</span>
      </span>
    </button>
    <p v-if="orderedBranches.length === 0" class="empty ds-meta ds-meta--sm">
      No hay sedes activas.
    </p>
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

.ico {
  color: var(--amatista-600);
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

/* El nombre es `.ds-text-strong` + `--md`; el vacío, `.ds-meta` + `--sm`. */
.empty {
  margin: 0;
  font-style: italic;
}
</style>

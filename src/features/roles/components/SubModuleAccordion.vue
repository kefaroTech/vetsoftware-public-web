<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import TristateCheckbox, { type TristateValue } from './TristateCheckbox.vue'
import type { PermissionResponse, SubModuleResponse } from '../types'

const props = defineProps<{
  subModule: SubModuleResponse
  permissions: PermissionResponse[]
  selected: Set<number>
  expanded: boolean
  highlight?: string
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'toggle-expand': []
  'toggle-sub': []
  'toggle-permission': [permissionId: number]
}>()

const total = computed(() => props.permissions.length)
const selectedCount = computed(
  () => props.permissions.filter((p) => props.selected.has(p.id)).length,
)
const tristate = computed<TristateValue>(() => {
  if (selectedCount.value === 0) return 'empty'
  if (selectedCount.value === total.value) return 'full'
  return 'partial'
})
const statusLabel = computed(() => {
  if (tristate.value === 'empty') return 'Sin acceso'
  if (tristate.value === 'full') return 'Acceso total'
  return `Parcial · ${selectedCount.value}/${total.value}`
})

function isHighlighted(text: string): boolean {
  if (!props.highlight) return false
  return text.toLocaleLowerCase().includes(props.highlight.toLocaleLowerCase())
}
</script>

<template>
  <div class="acc" :class="{ open: expanded }">
    <button type="button" class="row" :aria-expanded="expanded" @click="emit('toggle-expand')">
      <ChevronRight class="chev" :class="{ open: expanded }" :size="14" :stroke-width="1.7" />
      <span class="cb-wrap" @click.stop>
        <TristateCheckbox
          :value="tristate"
          :disabled="readOnly"
          :aria-label="`Toggle todos los permisos de ${subModule.name}`"
          @toggle="emit('toggle-sub')"
        />
      </span>
      <span class="meta">
        <span class="name" :class="{ hl: isHighlighted(subModule.name) }">{{
          subModule.name
        }}</span>
        <span class="count">{{ selectedCount }} de {{ total }} permisos</span>
      </span>
      <span class="status" :class="tristate">{{ statusLabel }}</span>
    </button>

    <ul v-if="expanded" class="perm-list">
      <li v-for="p in permissions" :key="p.id" class="perm-row">
        <label class="perm-label">
          <input
            type="checkbox"
            :checked="selected.has(p.id)"
            :disabled="readOnly"
            class="native"
            @change="emit('toggle-permission', p.id)"
          />
          <span class="perm-name" :class="{ hl: isHighlighted(p.name) }">{{ p.name }}</span>
        </label>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.acc {
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  background: var(--warm-50);
  overflow: hidden;
}

.acc.open {
  border-color: var(--amatista-200);
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: transparent;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.row:hover {
  background: var(--warm-100);
}

.chev {
  color: var(--warm-500);
  transition: transform 0.15s ease;
  flex-shrink: 0;
}

.chev.open {
  transform: rotate(90deg);
}

.cb-wrap {
  display: inline-flex;
  align-items: center;
}

.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.2;
}

.name.hl {
  background: oklch(96% 0.08 80deg);
  border-radius: 3px;
  padding: 0 3px;
  margin: 0 -3px;
}

.count {
  font-size: 11.5px;
  color: var(--warm-500);
}

.status {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  flex-shrink: 0;
}

.status.empty {
  background: var(--warm-200);
  color: var(--warm-600);
}

.status.partial {
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.status.full {
  background: var(--amatista-200);
  color: var(--amatista-700);
}

.perm-list {
  list-style: none;
  margin: 0;
  padding: 0 16px 10px 44px;
}

.perm-row {
  border-bottom: 1px solid var(--warm-150);
}

.perm-row:last-child {
  border-bottom: none;
}

.perm-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 0;
  cursor: pointer;
  font-size: 13px;
  color: var(--warm-700);
  user-select: none;
}

.perm-label:hover .perm-name {
  color: var(--warm-900);
}

.native {
  width: 16px;
  height: 16px;
  accent-color: var(--amatista-600);
  cursor: pointer;
  flex-shrink: 0;
}

.native:checked + .perm-name {
  color: var(--warm-900);
}

.perm-name {
  flex: 1;
}

.perm-name.hl {
  background: oklch(96% 0.08 80deg);
  border-radius: 3px;
  padding: 0 3px;
  margin: 0 -3px;
}
</style>

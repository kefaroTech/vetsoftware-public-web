<script setup lang="ts">
import { computed } from 'vue'
import { EVENT_TYPES, TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'
import type { AgendaEvent } from '../types/agenda'

const props = defineProps<{
  modelValue: ClinicalEventType | 'ALL'
  events: AgendaEvent[]
}>()

const emit = defineEmits<{ 'update:modelValue': [v: ClinicalEventType | 'ALL'] }>()

const TYPE_ORDER: ClinicalEventType[] = [
  'CONSULTATION',
  'SURGERY',
  'VACCINATION',
  'DEWORMING',
  'HOSPITALIZATION',
  'LABORATORY_TEST',
  'DIAGNOSTIC_IMAGING',
  'PRESCRIPTION',
  'SPA',
]

const countByType = computed(() => {
  const map = new Map<ClinicalEventType, number>()
  for (const ev of props.events) {
    map.set(ev.type, (map.get(ev.type) ?? 0) + 1)
  }
  return map
})

function select(value: ClinicalEventType | 'ALL') {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="filters">
    <button
      type="button"
      class="chip all-chip"
      :class="{ active: modelValue === 'ALL' }"
      @click="select('ALL')"
    >
      <span class="label">Todos</span>
      <span class="count">{{ events.length }}</span>
    </button>
    <button
      v-for="type in TYPE_ORDER"
      :key="type"
      type="button"
      class="chip"
      :class="{ active: modelValue === type }"
      :style="
        modelValue === type
          ? {
              background: TYPE_COLORS[EVENT_TYPES[type].color].bg,
              color: TYPE_COLORS[EVENT_TYPES[type].color].fg,
              borderColor: 'transparent',
            }
          : {}
      "
      @click="select(type)"
    >
      <span class="icon" aria-hidden="true">{{ EVENT_TYPES[type].icon }}</span>
      <span class="label">{{ EVENT_TYPES[type].label }}</span>
      <span class="count">{{ countByType.get(type) ?? 0 }}</span>
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  background: transparent;
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.chip:hover:not(.active) {
  background: var(--warm-100);
  border-color: var(--warm-300);
}

.chip.active {
  background: var(--amatista-100);
  color: var(--amatista-700);
  border-color: transparent;
}

.all-chip.active {
  background: var(--amatista-700);
  color: white;
}

.icon {
  font-size: 12.5px;
  line-height: 1;
}

.count {
  font-size: 11px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--warm-100);
  color: var(--warm-700);
  min-width: 18px;
  text-align: center;
}

.chip.active .count {
  background: oklch(0% 0 0deg / 8%);
  color: inherit;
}

.all-chip.active .count {
  background: oklch(100% 0 0deg / 18%);
  color: white;
}
</style>

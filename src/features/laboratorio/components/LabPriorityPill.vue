<script setup lang="ts">
import type { LaboratoryTestPriority } from '@/types/domain'

defineProps<{ prioridad: LaboratoryTestPriority }>()

const LABEL: Record<LaboratoryTestPriority, string> = {
  NORMAL: 'Rutina',
  URGENTE: 'Urgente',
}
const TONE: Record<LaboratoryTestPriority, { bg: string; fg: string }> = {
  NORMAL: { bg: 'var(--warm-200)', fg: 'var(--warm-700)' },
  URGENTE: { bg: 'oklch(94% 0.09 70)', fg: 'oklch(45% 0.16 55)' },
}
</script>

<template>
  <span class="pill" :style="{ background: TONE[prioridad].bg, color: TONE[prioridad].fg }">
    {{ LABEL[prioridad] }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  white-space: nowrap;
  font-family: var(--font-sans);
}
</style>

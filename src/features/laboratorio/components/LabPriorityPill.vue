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
  <span class="pill ds-pill" :style="{ background: TONE[prioridad].bg, color: TONE[prioridad].fg }">
    {{ LABEL[prioridad] }}
  </span>
</template>

<style scoped>
.pill {
  padding: var(--space-2) var(--space-8);
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
</style>

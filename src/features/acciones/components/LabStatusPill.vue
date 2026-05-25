<script setup lang="ts">
import type { LaboratoryTestStatus } from '@/types/domain'

defineProps<{ status: LaboratoryTestStatus }>()

const STATUS_LABEL: Record<LaboratoryTestStatus, string> = {
  PENDIENTE: 'Pendiente',
  PENDIENTE_POR_PROCESAR: 'Pendiente por procesar',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
}

const STATUS_TONE: Record<LaboratoryTestStatus, { bg: string; fg: string; dot: string }> = {
  PENDIENTE: {
    bg: 'var(--warm-200)',
    fg: 'var(--warm-700)',
    dot: 'var(--warm-500)',
  },
  PENDIENTE_POR_PROCESAR: {
    bg: 'oklch(94% 0.07 80)',
    fg: 'oklch(45% 0.13 70)',
    dot: 'oklch(65% 0.15 75)',
  },
  COMPLETADO: {
    bg: 'oklch(94% 0.06 150)',
    fg: 'oklch(40% 0.13 150)',
    dot: 'oklch(55% 0.15 150)',
  },
  CANCELADO: {
    bg: 'oklch(94% 0.05 25)',
    fg: 'oklch(48% 0.18 25)',
    dot: 'oklch(60% 0.18 25)',
  },
}
</script>

<template>
  <span
    class="pill"
    :style="{ background: STATUS_TONE[status].bg, color: STATUS_TONE[status].fg }"
  >
    <span class="dot" :style="{ background: STATUS_TONE[status].dot }" />
    {{ STATUS_LABEL[status] }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  font-family: var(--font-sans);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>

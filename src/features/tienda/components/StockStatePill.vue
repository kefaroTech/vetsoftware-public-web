<script setup lang="ts">
import type { StockState } from '../types/tienda'

defineProps<{ state: StockState }>()

const LABEL: Record<StockState, string> = {
  OK: 'En stock',
  BAJO: 'Stock bajo',
  AGOTADO: 'Agotado',
}
const TONE: Record<StockState, { bg: string; fg: string; dot: string }> = {
  OK: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
  BAJO: { bg: 'oklch(95% 0.07 80)', fg: 'oklch(45% 0.13 70)', dot: 'oklch(65% 0.15 75)' },
  AGOTADO: { bg: 'oklch(95% 0.05 25)', fg: 'oklch(48% 0.18 25)', dot: 'oklch(60% 0.18 25)' },
}
</script>

<template>
  <span class="pill" :style="{ background: TONE[state].bg, color: TONE[state].fg }">
    <span class="dot" :style="{ background: TONE[state].dot }" />
    {{ LABEL[state] }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
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

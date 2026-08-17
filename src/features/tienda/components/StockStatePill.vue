<script setup lang="ts">
import TonePill from './TonePill.vue'
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
  <TonePill :tone="TONE[state]">{{ LABEL[state] }}</TonePill>
</template>

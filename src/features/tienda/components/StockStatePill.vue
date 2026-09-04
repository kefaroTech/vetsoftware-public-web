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
  OK: { bg: 'var(--success-50)', fg: 'var(--compras-ok-fg)', dot: 'var(--success-dot)' },
  BAJO: { bg: 'var(--warning-50)', fg: 'var(--warning-900)', dot: 'var(--warning-border)' },
  AGOTADO: { bg: 'var(--danger-50)', fg: 'var(--danger-700)', dot: 'var(--danger-border)' },
}
</script>

<template>
  <TonePill :tone="TONE[state]">{{ LABEL[state] }}</TonePill>
</template>

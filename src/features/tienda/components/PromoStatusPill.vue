<script setup lang="ts">
import TonePill from './TonePill.vue'
import type { DerivedPromoStatus } from '../types/tienda'

defineProps<{ status: DerivedPromoStatus }>()

const TONE: Record<DerivedPromoStatus, { bg: string; fg: string; dot: string }> = {
  ACTIVA: { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.15 150)' },
  PROGRAMADA: { bg: 'oklch(94% 0.06 240)', fg: 'oklch(45% 0.13 250)', dot: 'oklch(58% 0.15 245)' },
  VENCIDA: { bg: 'var(--warm-200)', fg: 'var(--warm-700)', dot: 'var(--warm-500)' },
  INACTIVA: { bg: 'var(--warm-150)', fg: 'var(--warm-600)', dot: 'var(--warm-400)' },
}
</script>

<template>
  <TonePill :tone="TONE[status]">{{ status.charAt(0) + status.slice(1).toLowerCase() }}</TonePill>
</template>

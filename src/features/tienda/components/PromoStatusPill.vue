<script setup lang="ts">
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
  <span class="pill" :style="{ background: TONE[status].bg, color: TONE[status].fg }">
    <span class="dot" :style="{ background: TONE[status].dot }" />
    {{ status.charAt(0) + status.slice(1).toLowerCase() }}
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

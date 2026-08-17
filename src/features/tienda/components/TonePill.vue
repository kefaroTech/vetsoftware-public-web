<script setup lang="ts">
/**
 * Píldora de estado con punto de color: la forma que compartían byte a byte
 * `StockStatePill` y `PromoStatusPill`. Cada uno conserva su mapa de tonos y su
 * etiqueta, que es lo único que los distinguía.
 */
defineProps<{ tone: { bg: string; fg: string; dot: string } }>()
</script>

<template>
  <span class="pill" :style="{ background: tone.bg, color: tone.fg }">
    <span class="dot" :style="{ background: tone.dot }" />
    <slot />
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

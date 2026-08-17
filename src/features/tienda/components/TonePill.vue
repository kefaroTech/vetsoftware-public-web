<script setup lang="ts">
/**
 * Píldora de estado con punto de color: la forma que compartían byte a byte
 * `StockStatePill` y `PromoStatusPill`. Cada uno conserva su mapa de tonos y su
 * etiqueta, que es lo único que los distinguía.
 */
defineProps<{ tone: { bg: string; fg: string; dot: string } }>()
</script>

<template>
  <span class="ds-pill" :style="{ background: tone.bg, color: tone.fg }">
    <span class="dot" :style="{ background: tone.dot }" />
    <slot />
  </span>
</template>

<style scoped>
/* La caja de la píldora es `.ds-pill` (primitives.css) y coincidía con ella en
   las nueve declaraciones. El tono sigue llegando por `:style` y el punto de
   estado se queda aquí: la primitiva sube la forma, nunca el color, justo para
   que cada píldora conserve el suyo. */
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>

<script setup lang="ts">
/**
 * Diferencia de un conteo físico (contado − sistema), en verde si cuadra, en
 * rojo si falta y en ámbar si sobra. Idéntica en la hoja de conteo y en el
 * detalle del historial.
 */
defineProps<{ value: number }>()
</script>

<template>
  <span class="diff" :class="{ zero: value === 0, neg: value < 0, pos: value > 0 }"
    >{{ value > 0 ? '+' : '' }}{{ value }}</span
  >
</template>

<style scoped>
.diff {
  font-weight: 600;
}
.diff.zero {
  color: oklch(55% 0.12 150deg);
}
.diff.neg {
  color: oklch(52% 0.18 25deg);
}
.diff.pos {
  color: oklch(52% 0.12 70deg);
}
</style>

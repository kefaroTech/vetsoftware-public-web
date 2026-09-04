<script setup lang="ts">
/**
 * Diferencia de un conteo físico: contado − sistema. El cero va en neutro: en
 * una columna de conteo el verde es el importe positivo de `.ds-amount--pos`,
 * así que un cero verde se lee como una entrada de mercancía.
 */
defineProps<{ value: number }>()
</script>

<template>
  <span
    class="diff"
    :class="[{ zero: value === 0, neg: value < 0, pos: value > 0 }, value < 0 && 'ds-amount--neg']"
    >{{ value > 0 ? '+' : '' }}{{ value }}</span
  >
</template>

<style scoped>
.diff {
  font-weight: var(--weight-semibold);
}
.diff.zero {
  color: var(--text-muted);
}
.diff.pos {
  color: var(--warning-900);
}
</style>

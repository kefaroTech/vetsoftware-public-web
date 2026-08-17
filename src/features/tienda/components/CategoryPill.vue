<script setup lang="ts">
import type { CategoryTone } from '../composables/categoryTone'

/**
 * Píldora con el nombre de la categoría y su tono. Tres copias idénticas
 * (`InventoryProductsTable`, `InventoryPausedTable`, `ServiciosView`), las tres
 * llamando dos veces al mismo `*CategoryTone()` para leer `bg` y `fg`.
 */
defineProps<{ tone: CategoryTone; label: string }>()
</script>

<template>
  <span class="catpill" :style="{ background: tone.bg, color: tone.fg }">{{ label }}</span>
</template>

<style scoped>
.catpill {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--warm-150);
  color: var(--warm-700);
}
</style>

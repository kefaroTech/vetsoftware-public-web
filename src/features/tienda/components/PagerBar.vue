<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

/**
 * Pie de paginación: texto a la izquierda, par de flechas a la derecha.
 * Cuatro copias con el mismo marcado (`InventoryProductsTable`,
 * `StockDetailModal`, `CountsHistoryModal`, `PurchasesModal`).
 *
 * El texto llega como prop porque cada anfitrión cuenta lo suyo (unos van en
 * base 0 y otro en base 1), y los límites llegan resueltos por la misma razón.
 */
withDefaults(
  defineProps<{
    label: string
    prevDisabled: boolean
    nextDisabled: boolean
    /** `sm` = paginador de modal (28px); `md` = el de pantalla (30px, con hover). */
    size?: 'sm' | 'md'
  }>(),
  { size: 'sm' },
)

const emit = defineEmits<{ prev: []; next: [] }>()
</script>

<template>
  <div class="pag" :class="`pag--${size}`">
    <span>{{ label }}</span>
    <div class="pag-ctrl">
      <button type="button" :disabled="prevDisabled" @click="emit('prev')">
        <ChevronLeft :size="14" />
      </button>
      <button type="button" :disabled="nextDisabled" @click="emit('next')">
        <ChevronRight :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--warm-500);
}
.pag--sm {
  margin-top: 12px;
  font-size: 12px;
}
.pag--md {
  margin-top: 14px;
  font-size: 12.5px;
}
.pag-ctrl {
  display: flex;
  gap: 6px;
}
.pag-ctrl button {
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 7px;
  color: var(--warm-700);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.pag--sm .pag-ctrl button {
  width: 28px;
  height: 28px;
}
.pag--md .pag-ctrl button {
  width: 30px;
  height: 30px;
}
.pag-ctrl button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Solo el paginador de pantalla se realzaba al pasar el ratón; los tres de
   modal no lo hacían y darles hover habría cambiado su aspecto. */
.pag--md .pag-ctrl button:hover:not(:disabled) {
  background: var(--warm-100);
}
</style>

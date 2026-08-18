<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
import AccentButton from './AccentButton.vue'
import CategoryPill from './CategoryPill.vue'
import { formatMoney } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
import type { ProductResponse } from '../types/tienda'

/**
 * Pestaña "Pausados": productos con `enabled=false`, ocultos del POS.
 *
 * Sin filtros ni paginación — la lista de pausados es corta por definición y así
 * era antes de salir de `InventarioView`.
 */
defineProps<{
  products: ProductResponse[]
  loading: boolean
  canDelete: boolean
}>()

const emit = defineEmits<{ reactivate: [product: ProductResponse] }>()
</script>

<template>
  <p class="paused-hint">
    Productos pausados (ocultos del punto de venta). Reactívalos para volverlos a vender.
  </p>
  <table class="ds-table">
    <thead>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>SKU</th>
        <th>Precio venta</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading">
        <td colspan="5" class="ds-empty ds-empty--lg">Cargando…</td>
      </tr>
      <tr v-else-if="products.length === 0">
        <td colspan="5" class="ds-empty ds-empty--lg">No hay productos pausados.</td>
      </tr>
      <tr v-for="p in products" v-else :key="p.id">
        <td class="tname ds-text-strong">{{ p.name }}</td>
        <td>
          <CategoryPill
            :tone="productCategoryTone(p.productCategory)"
            :label="p.productCategory.name"
          />
        </td>
        <td class="tsku">{{ p.code }}</td>
        <td>{{ formatMoney(p.salePrice) }}</td>
        <td class="tactions">
          <AccentButton v-if="canDelete" @click="emit('reactivate', p)">
            <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
          </AccentButton>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.paused-hint {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: var(--warm-500);
}

/* La tabla es `.ds-table` (primitives.css); la regla `.table` local se borró
   entera porque la primitiva la REEMPLAZA, no convive con ella. El
   `.ds-empty ds-empty--lg` del `<td colspan>` vacío lo resuelve la excepción
   `.ds-table td.ds-empty--lg` de `primitives.css` (0,2,1), que le gana a
   `.ds-table td` (0,1,1). */

/* El `font-weight` Y el `color` los pone `.ds-text-strong` (primitives.css):
   el `color` le llega vía la excepción `.ds-table td.ds-text-strong`
   (auditoría FE-08 fase final), que le gana a `.ds-table td` (0,1,1) por
   nombre; ya no queda CSS local para esta celda. */
.tsku {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--warm-600);
}
.tactions {
  display: flex;
  gap: 6px;
  align-items: center;
}

@media (width <= 760px) {
  .ds-table {
    display: block;
    overflow-x: auto;
  }
}
</style>

<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next'
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
  <table class="table">
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
        <td class="tname">{{ p.name }}</td>
        <td>
          <span
            class="catpill"
            :style="{
              background: productCategoryTone(p.productCategory).bg,
              color: productCategoryTone(p.productCategory).fg,
            }"
            >{{ p.productCategory.name }}</span
          >
        </td>
        <td class="tsku">{{ p.code }}</td>
        <td>{{ formatMoney(p.salePrice) }}</td>
        <td class="tactions">
          <button v-if="canDelete" type="button" class="reactivate" @click="emit('reactivate', p)">
            <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
          </button>
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
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.table th {
  text-align: left;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 11px 14px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
  vertical-align: middle;
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.tname {
  font-weight: 500;
  color: var(--warm-900);
}
.tsku {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--warm-600);
}
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
.tactions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.reactivate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--amatista-200);
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.reactivate:hover {
  background: var(--amatista-100);
}

@media (width <= 760px) {
  .table {
    display: block;
    overflow-x: auto;
  }
}
</style>

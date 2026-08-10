<script setup lang="ts">
import { Plus, Search } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'

export interface CatalogItem {
  id: number
  name: string
  price: number
  soldOut: boolean
  category?: string
}

/**
 * Selector de servicios/productos para añadir cargos a una cuenta: pestañas,
 * buscador y lista. Sale de `OpenAccountModal` con sus 11 reglas de CSS.
 */
defineProps<{
  tab: 'service' | 'product'
  query: string
  items: CatalogItem[]
}>()

const emit = defineEmits<{
  'update:tab': [tab: 'service' | 'product']
  'update:query': [value: string]
  add: [item: CatalogItem]
}>()
</script>

<template>
  <div class="tabs">
    <button
      type="button"
      class="tab"
      :class="{ active: tab === 'service' }"
      @click="emit('update:tab', 'service')"
    >
      Servicios
    </button>
    <button
      type="button"
      class="tab"
      :class="{ active: tab === 'product' }"
      @click="emit('update:tab', 'product')"
    >
      Productos
    </button>
  </div>
  <div class="search">
    <Search :size="14" :stroke-width="1.7" class="s-icon" />
    <input
      :value="query"
      type="text"
      class="s-input"
      placeholder="Buscar por nombre o categoría…"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
    />
  </div>
  <ul class="catalog">
    <li v-for="it in items" :key="it.id" class="cat-row" :class="{ disabled: it.soldOut }">
      <span class="cat-name">{{ it.name }}</span>
      <span v-if="it.soldOut" class="badge-out">Agotado</span>
      <span v-else class="cat-price">{{ formatMoney(it.price) }}</span>
      <button type="button" class="add-btn" :disabled="it.soldOut" @click="emit('add', it)">
        <Plus :size="14" :stroke-width="1.9" /> Agregar
      </button>
    </li>
    <li v-if="items.length === 0" class="ds-empty ds-empty--tight">
      No hay ítems en este catálogo.
    </li>
  </ul>
</template>

<style scoped>
/* Tabs + búsqueda */
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 12px;
}

.tab {
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--warm-600);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-700);
  font-weight: 500;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.s-icon {
  position: absolute;
  left: 13px;
  color: var(--warm-500);
}

.s-input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}

.s-input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

/* Catálogo */
.catalog {
  list-style: none;
  margin: 0 0 16px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow: auto;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  transition:
    border-color 0.12s,
    background 0.12s;
}

.cat-row:hover:not(.disabled) {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}

.cat-row.disabled {
  opacity: 0.6;
}

.cat-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--warm-900);
}

.cat-price {
  font-size: 13px;
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}

.badge-out {
  font-size: var(--text-2xs);
  font-weight: var(--weight-semibold);
  color: var(--danger-700);
  background: var(--danger-100);
  border-radius: var(--radius-pill);
  padding: var(--space-2) var(--space-8);
}

.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  background: var(--amatista-50);
  color: var(--amatista-700);
  border: 1px solid var(--amatista-200);
}

.add-btn:hover:not(:disabled) {
  background: var(--amatista-100);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { Package, Search, Stethoscope } from 'lucide-vue-next'
import { formatMoney } from '../composables/pricing'
import type { StockState, TaxTreatment } from '../types/tienda'

/**
 * Panel izquierdo del POS: pestañas de modo, buscador, filtro por categoría y la
 * rejilla de tarjetas. Sale de `POSView` con su CSS — eran ~100 líneas de
 * marcado y 30 reglas que no comparte con el ticket.
 */
export interface CatalogCard {
  id: number
  name: string
  basePrice: number
  price: number
  promoName: string | null
  taxTreatment: TaxTreatment
  taxPercentage: number
  taxName?: string
  stockState: StockState | null
  stockCount: number | null
  isService: boolean
  toneBg: string
  toneFg: string
}

defineProps<{
  mode: 'producto' | 'servicio' | 'paquete'
  query: string
  cat: string
  categories: { id: number; name: string }[]
  cards: CatalogCard[]
}>()

const emit = defineEmits<{
  'update:mode': [value: 'producto' | 'servicio' | 'paquete']
  'update:query': [value: string]
  'update:cat': [value: string]
  add: [card: CatalogCard]
}>()
</script>

<template>
  <section class="catalog">
    <div class="catalog-head">
      <div class="modetabs">
        <button
          type="button"
          class="modetab"
          :class="{ active: mode === 'producto' }"
          @click="emit('update:mode', 'producto')"
        >
          <Package :size="14" :stroke-width="1.7" /> Productos
        </button>
        <button
          type="button"
          class="modetab"
          :class="{ active: mode === 'servicio' }"
          @click="emit('update:mode', 'servicio')"
        >
          <Stethoscope :size="14" :stroke-width="1.7" /> Servicios
        </button>
        <button
          type="button"
          class="modetab"
          :class="{ active: mode === 'paquete' }"
          @click="emit('update:mode', 'paquete')"
        >
          <Package :size="14" :stroke-width="1.7" /> Paquetes
        </button>
      </div>

      <template v-if="mode !== 'paquete'">
        <div class="search">
          <Search :size="15" :stroke-width="1.7" class="s-icon" />
          <input
            :value="query"
            type="search"
            :placeholder="mode === 'producto' ? 'Buscar producto o SKU…' : 'Buscar servicio…'"
            @input="emit('update:query', ($event.target as HTMLInputElement).value)"
          />
        </div>
        <div class="cats">
          <button
            type="button"
            class="cat"
            :class="{ active: cat === '' }"
            @click="emit('update:cat', '')"
          >
            Todos
          </button>
          <button
            v-for="c in categories"
            :key="c.id"
            type="button"
            class="cat"
            :class="{ active: cat === String(c.id) }"
            @click="emit('update:cat', String(c.id))"
          >
            {{ c.name }}
          </button>
        </div>
      </template>
    </div>

    <div class="grid">
      <div v-if="mode === 'paquete'" class="grid-empty">El backend aún no soporta paquetes.</div>
      <div v-else-if="cards.length === 0" class="grid-empty">
        {{
          mode === 'producto' ? 'Sin productos para el filtro.' : 'Sin servicios para el filtro.'
        }}
      </div>
      <button
        v-for="c in cards"
        :key="`${mode}-${c.id}`"
        type="button"
        class="pcard"
        @click="emit('add', c)"
      >
        <span v-if="c.promoName" class="promo-badge">Promo</span>
        <div class="pcard-thumb" :style="{ background: c.toneBg, color: c.toneFg }">
          <component :is="c.isService ? Stethoscope : Package" :size="22" :stroke-width="1.6" />
        </div>
        <div class="pcard-name">{{ c.name }}</div>
        <div class="pcard-foot">
          <span class="pcard-price">
            <span v-if="c.promoName" class="price-old">{{ formatMoney(c.basePrice) }}</span>
            {{ formatMoney(c.price) }}
          </span>
          <span
            v-if="!c.isService && c.stockState"
            class="pcard-stock"
            :class="`st-${c.stockState.toLowerCase()}`"
          >
            {{ c.stockState === 'AGOTADO' ? 'Agotado' : c.stockCount + ' u' }}
          </span>
          <span v-else-if="c.isService" class="pcard-svc">Servicio</span>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.catalog {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.catalog-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 14px;
}

.modetabs {
  display: inline-flex;
  gap: 3px;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 3px;
  align-self: flex-start;
}

.modetab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: none;
  background: transparent;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-600);
  cursor: pointer;
}

.modetab.active {
  background: var(--warm-50);
  color: var(--amatista-700);
  box-shadow: 0 1px 2px rgb(0 0 0 / 5%);
}

.search {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 13px;
}

.search:focus-within {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

.s-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}

.search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  min-width: 0;
}

.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat {
  padding: 6px 13px;
  border-radius: var(--radius-pill);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-700);
  cursor: pointer;
}

.cat:hover {
  border-color: var(--amatista-300);
}

.cat.active {
  background: var(--amatista-700);
  color: #fff;
  border-color: var(--amatista-700);
  font-weight: 500;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  align-content: start;
}

.grid-empty {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}

.pcard {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.pcard:hover:not(.disabled) {
  border-color: var(--amatista-300);
  box-shadow: 0 4px 14px -8px rgb(20 15 30 / 18%);
}

.pcard.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.pcard-thumb {
  height: 56px;
  border-radius: 9px;
  display: grid;
  place-items: center;
}

.pcard-thumb.prod {
  background: var(--warm-150);
  color: var(--warm-600);
}

.pcard-thumb.svc {
  background: var(--amatista-50);
  color: var(--amatista-700);
}

.pcard-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 34px;
}

.pcard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.pcard-price {
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-900);
}

.price-old {
  font-size: 11px;
  color: var(--warm-400);
  text-decoration: line-through;
  margin-right: 6px;
  font-weight: 400;
}

.pcard-stock {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--warm-150);
  color: var(--warm-600);
  white-space: nowrap;
}

.pcard-stock.st-bajo {
  background: oklch(94% 0.07 80deg);
  color: oklch(45% 0.13 70deg);
}

.pcard-stock.st-agotado {
  background: oklch(93% 0.06 25deg);
  color: oklch(48% 0.19 25deg);
}

.pcard-svc {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: var(--amatista-50);
  color: var(--amatista-700);
}

.promo-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: var(--radius-pill);
  background: oklch(58% 0.18 25deg);
  color: #fff;
}

.modetabs {
  display: grid;
  grid-template-columns: 1fr;
  align-self: stretch;
  width: 100%;
}

.modetab {
  justify-content: center;
  padding: 7px 8px;
}

.grid-empty {
  padding: 28px 14px;
}

@media (width <= 760px) {
  .catalog,
  .catalog-head,
  .search,
  .cats,
  .grid {
    min-width: 0;
    width: 100%;
  }
}
</style>

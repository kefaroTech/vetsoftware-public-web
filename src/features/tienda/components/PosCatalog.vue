<script setup lang="ts">
import { Package, Stethoscope } from 'lucide-vue-next'
import SearchField from './SearchField.vue'
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
  <section class="catalog ds-stack">
    <div class="catalog-head ds-stack">
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
        <SearchField
          :model-value="query"
          :placeholder="mode === 'producto' ? 'Buscar producto o SKU…' : 'Buscar servicio…'"
          @update:model-value="emit('update:query', $event)"
        />
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
      <div v-if="mode === 'paquete'" class="grid-empty ds-grid-span ds-empty">
        El backend aún no soporta paquetes.
      </div>
      <div v-else-if="cards.length === 0" class="grid-empty ds-grid-span ds-empty">
        {{
          mode === 'producto' ? 'Sin productos para el filtro.' : 'Sin servicios para el filtro.'
        }}
      </div>
      <button
        v-for="c in cards"
        :key="`${mode}-${c.id}`"
        type="button"
        class="pcard ds-stack ds-stack--8"
        @click="emit('add', c)"
      >
        <span v-if="c.promoName" class="promo-badge">Promo</span>
        <div class="pcard-thumb" :style="{ background: c.toneBg, color: c.toneFg }">
          <component :is="c.isService ? Stethoscope : Package" :size="22" :stroke-width="1.6" />
        </div>
        <div class="pcard-name ds-item-label">{{ c.name }}</div>
        <div class="pcard-foot">
          <span class="pcard-price ds-strong">
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
/* Las dos columnas son `.ds-stack` (primitives.css); 12px no es ninguno de los
   cinco huecos catalogados, así que el `gap` se queda aquí — la primitiva base
   no declara ninguno, de modo que no hay dos reglas compitiendo. */
.catalog {
  min-height: 0;
}

.catalog-head {
  gap: 12px;
  margin-bottom: 14px;
}

/* Un único bloque por pieza: `.modetabs`, `.modetab` y `.grid-empty` estaban
   declarados dos veces cada uno y ganaba el segundo. Al consolidarlos quedó a
   la vista que el valor ganador de `.modetabs` no era el bueno: era
   `grid-template-columns: 1fr`, un valor de móvil que se escapó del
   `@media` y que apilaba las tres pestañas en vertical a CUALQUIER ancho. El
   resto del estilo pedía lo contrario a gritos (fondo `--warm-150` con
   `padding: 3px`, `gap: 3px`, pestaña `inline-flex` centrada y activa con
   fondo claro y sombra: un conmutador segmentado de manual). Corregido aquí a
   horizontal con reparto a partes iguales.

   Va con `flex-wrap` en vez de tres columnas fijas para no inventarse un punto
   de corte: las tres pestañas miden ~300px con su icono, así que caben en una
   línea desde ~360px de ancho y por debajo de eso una salta sola a la
   siguiente en lugar de desbordar la caja. El `@media (width <= 760px)` de
   este archivo NO es su sitio: allí el catálogo ya ocupa el ancho completo
   (`.pos` de `POSView` pasa a una columna en 900px) y espacio es justo lo que
   sobra — apilarlas ahí sería volver al defecto, no arreglarlo. */
.modetabs {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 3px;
  align-self: stretch;
  width: 100%;
}

.modetab {
  flex: 1 1 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 8px;
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

.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* A11Y-09 · píldora de categoría pulsable: `--warm-200` daba 1,23:1, así que el
   control no tenía frontera. `--warm-450` da 3,55:1. La tanda anterior de
   A11Y-09 buscó por token y no llegó aquí. */
.cat {
  padding: 6px 13px;
  border-radius: var(--radius-pill);
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-700);
  cursor: pointer;
}

/* NO es `.ds-hover-accent`: esa primitiva tiñe fondo, borde y texto a la vez, y
   aquí la píldora de categoría sólo oscurece el contorno. */
.cat:hover {
  border-color: var(--amatista-450);
}

.cat.active {
  background: var(--amatista-700);
  color: #fff;
  border-color: var(--amatista-700);
  font-weight: 500;
}

/* NO es `.ds-grid-auto`: la primitiva reparte columnas de 240px como mínimo y
   estas tarjetas de producto miden 160. Con la primitiva el catálogo pasaría de
   5-6 columnas a 3-4 al mismo ancho. */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  align-content: start;
}

/* `.ds-empty` pone el color y el centrado; el aire de esta rejilla es 28/14 en
   vez de 32, y sobrescribir el `padding` de la primitiva por su propio nombre
   es el patrón que `primitives.css` documenta como deliberado. */
.grid-empty {
  padding: 28px 14px;
  font-size: 13px;
}

/* A11Y-09 · la tarjeta de producto es pulsable: `--warm-200` daba 1,23:1.
   `--warm-450` da 3,55:1. */
.pcard {
  position: relative;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

/* No hay estado deshabilitado en la tarjeta: el POS avisa del agotado con la
   píldora de stock, nunca bloquea el clic. La regla `.pcard.disabled` y el
   `:not(.disabled)` de este hover no llegaban a aplicarse nunca. */
.pcard:hover {
  border-color: var(--amatista-450);
  box-shadow: var(--shadow-sm);
}

.pcard-thumb {
  height: 56px;
  border-radius: 9px;
  display: grid;
  place-items: center;
}

/* El tono del thumb llega en `:style` desde `categoryTone`; las variantes
   `.prod`/`.svc` que había aquí no las ponía nadie. */
.pcard-name {
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

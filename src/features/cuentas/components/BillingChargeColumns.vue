<script setup lang="ts">
import { Check, Minus, Plus, X } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { BillingCartKind, BillingCartLine } from '../composables/useConsultaBilling'
import type { UnifiedCharge } from '../types/cuentas'

interface CatalogEntry {
  id: number
  name: string
  price: number
  soldOut: boolean
  category: string
}

/**
 * Las dos columnas del modal de facturación: catálogo a la izquierda, cargos
 * seleccionados a la derecha.
 *
 * No reusa `AccountCatalogPanel` / `AccountCartPanel` a propósito. Aquellos son
 * de `OpenAccountModal` y difieren de verdad: botón "Agregar" con texto frente
 * al `+` de aquí, cabecera fija, y ninguna sección de cargos previos. Forzar la
 * reutilización cambiaría el aspecto de las dos pantallas.
 */
defineProps<{
  tab: BillingCartKind
  query: string
  catalog: CatalogEntry[]
  items: BillingCartLine[]
  existingCharges: UnifiedCharge[]
  showExisting: boolean
  heading: string
  busy: boolean
}>()

const emit = defineEmits<{
  selectTab: [tab: BillingCartKind]
  'update:query': [value: string]
  add: [entry: CatalogEntry]
  setQty: [line: BillingCartLine, qty: number]
  remove: [line: BillingCartLine]
}>()
</script>

<template>
  <div class="cols ds-grid-2">
    <!-- Izquierda — catálogo -->
    <div class="catalog">
      <div class="srcseg">
        <button
          type="button"
          class="srcbtn"
          :class="{ active: tab === 'service' }"
          @click="emit('selectTab', 'service')"
        >
          Servicios
        </button>
        <button
          type="button"
          class="srcbtn"
          :class="{ active: tab === 'product' }"
          @click="emit('selectTab', 'product')"
        >
          Productos
        </button>
      </div>
      <input
        :value="query"
        type="text"
        class="search ds-focus-ring"
        placeholder="Buscar por nombre o categoría…"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
      <ul class="catlist ds-list-reset ds-stack">
        <li
          v-for="it in catalog"
          :key="it.id"
          class="catrow ds-flex-row ds-flex-row--12"
          :class="it.soldOut ? 'ds-is-disabled--60' : 'ds-hover-accent'"
        >
          <span class="cr-name">{{ it.name }}</span>
          <span v-if="it.soldOut" class="badge-out">Agotado</span>
          <span v-else class="ds-num ds-meta-dark">{{ formatMoney(it.price) }}</span>
          <button
            type="button"
            class="cr-add"
            :class="{ 'ds-is-disabled--40': it.soldOut || busy }"
            :disabled="it.soldOut || busy"
            :aria-label="`Agregar ${it.name} a los cargos`"
            @click="emit('add', it)"
          >
            <Plus :size="14" :stroke-width="2" />
          </button>
        </li>
        <li v-if="catalog.length === 0" class="ds-empty ds-empty--tight">
          No hay ítems en este catálogo.
        </li>
      </ul>
    </div>

    <!-- Derecha — cargos seleccionados -->
    <div class="selected ds-stack">
      <div class="selhead">{{ heading }}</div>

      <!-- Cargos previos (solo lectura) -->
      <template v-if="showExisting && existingCharges.length">
        <div class="existing-lab">Ya en la cuenta · solo lectura</div>
        <ul class="existing-list ds-list-reset ds-stack">
          <li
            v-for="c in existingCharges"
            :key="`${c.kind}-${c.id}`"
            class="existing-row ds-flex-row ds-meta-dark ds-meta-dark--sm"
          >
            <Check :size="13" :stroke-width="2" class="ds-icon-muted ds-icon-muted--dim" />
            <span class="ds-flex-fill ds-truncate">{{ c.concept }}</span>
            <span class="ex-date ds-num">{{ c.date.slice(5, 10) }}</span>
            <span class="ds-num">{{ formatMoney(c.amount) }}</span>
          </li>
        </ul>
        <div class="divider">Nuevos cargos</div>
      </template>

      <!-- Cargos nuevos editables -->
      <ul v-if="items.length" class="sel-list ds-list-reset ds-stack">
        <li v-for="line in items" :key="`${line.kind}-${line.id}`" class="selrow">
          <span class="ds-flex-fill ds-stack sel-info">
            <span class="sel-name ds-truncate">{{ line.name }}</span>
            <span class="ds-meta ds-meta--caption"
              >{{ line.kind === 'service' ? 'Servicio' : 'Producto' }} ·
              {{ formatMoney(line.unitPrice) }}</span
            >
          </span>
          <span class="stepper">
            <button
              type="button"
              class="st-btn ds-tone--accent-border"
              :aria-label="`Quitar una unidad de ${line.name}`"
              @click="emit('setQty', line, line.qty - 1)"
            >
              <Minus :size="12" :stroke-width="2.2" />
            </button>
            <input
              class="st-input"
              type="text"
              inputmode="numeric"
              :value="line.qty"
              :aria-label="`Cantidad de ${line.name}`"
              @input="emit('setQty', line, Number(($event.target as HTMLInputElement).value))"
            />
            <button
              type="button"
              class="st-btn ds-tone--accent-border"
              :aria-label="`Añadir una unidad de ${line.name}`"
              @click="emit('setQty', line, line.qty + 1)"
            >
              <Plus :size="12" :stroke-width="2.2" />
            </button>
          </span>
          <span class="sel-total ds-num">{{ formatMoney(line.unitPrice * line.qty) }}</span>
          <button type="button" class="sel-remove" title="Quitar" @click="emit('remove', line)">
            <X :size="13" :stroke-width="1.9" />
          </button>
        </li>
      </ul>
      <div v-else class="sel-empty ds-stack">
        <span>Aún no has agregado cargos.</span>
        <span class="hint">Elige del catálogo a la izquierda.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-grid-2 (dos columnas exactas y su colapso en
   640px, que es el que ya tenía), .ds-stack, .ds-flex-row, .ds-flex-fill,
   .ds-truncate, .ds-num, .ds-list-reset, .ds-focus-ring, .ds-meta(--caption),
   .ds-meta-dark(--sm), .ds-icon-muted(--dim) y .ds-is-disabled--60. */
.cols {
  gap: 16px;
  align-items: start;
}

/* Catálogo */
.srcseg {
  display: inline-flex;
  background: var(--warm-150);
  border-radius: 9px;
  padding: 3px;
  gap: 3px;
  margin-bottom: 10px;
}
.srcbtn {
  padding: 6px 14px;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 7px;
  color: var(--warm-600);
  font-weight: 500;
}
.srcbtn.active {
  background: var(--warm-50);
  color: var(--amatista-700);
  box-shadow: 0 1px 2px rgb(20 15 30 / 8%);
}
.search {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
  margin-bottom: 10px;
}
.catlist {
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}
.catrow {
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  transition:
    border-color 0.12s,
    background 0.12s;
}

/* El hover de la fila es `.ds-hover-accent` (primitives.css), enganchada con
   `:class` sólo cuando el ítem NO está agotado — sustituye al
   `:not(.ds-is-disabled--60)` del selector local. Pesa (0,3,0) y gana al
   `.catrow[data-v-…]` de (0,2,0) sin tocar la base. Su tercera declaración
   (`color: amatista-700`) no se ve: `.cr-name`, `.badge-out`, `.ds-meta-dark` y
   `.cr-add` fijan su propio color y la fila no tiene texto directo. */

/* `flex: 1` a secas, sin el `min-width: 0` de `.ds-flex-fill`: el nombre del
   ítem no debe encogerse por debajo de su contenido (no lleva elipsis). */
.cr-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--warm-900);
}
.badge-out {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--danger-700);
  background: var(--danger-100);
  border-radius: var(--radius-pill);
  padding: 2px 8px;
}
.cr-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  background: var(--amatista-50);
  color: var(--amatista-700);
  border: 1px solid var(--amatista-200);
}
.cr-add:hover:not(:disabled) {
  background: var(--amatista-100);
}

/* La opacidad la pone `.ds-is-disabled--40` (primitives.css), enganchada con
   `:class` en el template; aquí sólo queda el cursor, que la primitiva no
   podría fijar sin ganarle al `cursor: pointer` de `.cr-add`. */
.cr-add:disabled {
  cursor: not-allowed;
}

/* Cargos seleccionados */
.selected {
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-50);
  overflow: hidden;
  min-height: 240px;
}
.selhead {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 14px 16px;
  border-bottom: 1px solid var(--warm-200);
}
.existing-lab {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-400);
  font-weight: 600;
  padding: 10px 16px 6px;
}
.existing-list {
  padding: 0 12px;
  gap: 3px;
  opacity: 0.75;
}
.existing-row {
  padding: 7px 6px;
}
.ex-date {
  font-size: 11px;
  color: var(--warm-400);
}
.divider {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 8px 16px 6px;
  border-top: 1px solid var(--warm-150);
  margin-top: 6px;
}
.sel-list {
  padding: 8px 12px 12px;
  gap: 6px;
}
.selrow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--warm-100);
}
.sel-info {
  gap: 1px;
}
.sel-name {
  font-size: 13px;
  color: var(--warm-900);
}
.stepper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.st-btn {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
}

/* El hover del stepper es `.ds-tone--accent-border` (primitives.css), enganchada
   en el template — el mismo cambio que en `AccountCartPanel`, que tiene el
   stepper gemelo. Su forma `:hover:not(:disabled)` pesa (0,3,0) y gana al
   `.st-btn[data-v-…]` de (0,2,0); la base (0,1,0) pierde contra ese mismo
   selector, así que el reposo sigue siendo warm-200/warm-700. El guardián
   `:not(:disabled)` es inerte: estos botones nunca se deshabilitan (el único
   `:disabled` de la columna es `.cr-add`). */
.st-input {
  width: 30px;
  text-align: center;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warm-800);
  border: 1px solid var(--warm-200);
  border-radius: 6px;
  padding: 3px 0;
  outline: none;
  background: var(--warm-50);
  font-variant-numeric: tabular-nums;
}
.st-input:focus {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 2px var(--amatista-50);
}
.sel-total {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  white-space: nowrap;
  min-width: 64px;
}
.sel-remove {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: var(--warm-400);
  cursor: pointer;
  border-radius: 5px;
  display: grid;
  place-items: center;
}
.sel-remove:hover {
  background: oklch(94% 0.05 25deg);
  color: var(--danger-700);
}
.sel-empty {
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-400);
}
.sel-empty .hint {
  font-size: 12px;
  color: var(--warm-400);
}
</style>

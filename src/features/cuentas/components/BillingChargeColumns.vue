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
  <div class="cols">
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
        class="search"
        placeholder="Buscar por nombre o categoría…"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
      <ul class="catlist">
        <li v-for="it in catalog" :key="it.id" class="catrow" :class="{ disabled: it.soldOut }">
          <span class="cr-name">{{ it.name }}</span>
          <span v-if="it.soldOut" class="badge-out">Agotado</span>
          <span v-else class="cr-price">{{ formatMoney(it.price) }}</span>
          <button
            type="button"
            class="cr-add"
            :disabled="it.soldOut || busy"
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
    <div class="selected">
      <div class="selhead">{{ heading }}</div>

      <!-- Cargos previos (solo lectura) -->
      <template v-if="showExisting && existingCharges.length">
        <div class="existing-lab">Ya en la cuenta · solo lectura</div>
        <ul class="existing-list">
          <li v-for="c in existingCharges" :key="`${c.kind}-${c.id}`" class="existing-row">
            <Check :size="13" :stroke-width="2" class="ex-check" />
            <span class="ex-concept">{{ c.concept }}</span>
            <span class="ex-date">{{ c.date.slice(5, 10) }}</span>
            <span class="ex-amount">{{ formatMoney(c.amount) }}</span>
          </li>
        </ul>
        <div class="divider">Nuevos cargos</div>
      </template>

      <!-- Cargos nuevos editables -->
      <ul v-if="items.length" class="sel-list">
        <li v-for="line in items" :key="`${line.kind}-${line.id}`" class="selrow">
          <span class="sel-info">
            <span class="sel-name">{{ line.name }}</span>
            <span class="sel-kind"
              >{{ line.kind === 'service' ? 'Servicio' : 'Producto' }} ·
              {{ formatMoney(line.unitPrice) }}</span
            >
          </span>
          <span class="stepper">
            <button type="button" class="st-btn" @click="emit('setQty', line, line.qty - 1)">
              <Minus :size="12" :stroke-width="2.2" />
            </button>
            <input
              class="st-input"
              type="text"
              inputmode="numeric"
              :value="line.qty"
              @input="emit('setQty', line, Number(($event.target as HTMLInputElement).value))"
            />
            <button type="button" class="st-btn" @click="emit('setQty', line, line.qty + 1)">
              <Plus :size="12" :stroke-width="2.2" />
            </button>
          </span>
          <span class="sel-total">{{ formatMoney(line.unitPrice * line.qty) }}</span>
          <button type="button" class="sel-remove" title="Quitar" @click="emit('remove', line)">
            <X :size="13" :stroke-width="1.9" />
          </button>
        </li>
      </ul>
      <div v-else class="sel-empty">
        <span>Aún no has agregado cargos.</span>
        <span class="hint">Elige del catálogo a la izquierda.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

@media (width <= 640px) {
  .cols {
    grid-template-columns: 1fr;
  }
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
.search:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.catlist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow: auto;
}
.catrow {
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
.catrow:hover:not(.disabled) {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.catrow.disabled {
  opacity: 0.6;
}
.cr-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--warm-900);
}
.cr-price {
  font-size: 13px;
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
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
.cr-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Cargos seleccionados */
.selected {
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-50);
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  list-style: none;
  margin: 0;
  padding: 0 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  opacity: 0.75;
}
.existing-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  font-size: 12.5px;
  color: var(--warm-600);
}
.ex-check {
  color: var(--warm-400);
  flex-shrink: 0;
}
.ex-concept {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ex-date {
  font-size: 11px;
  color: var(--warm-400);
  font-variant-numeric: tabular-nums;
}
.ex-amount {
  font-variant-numeric: tabular-nums;
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
  list-style: none;
  margin: 0;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.sel-name {
  font-size: 13px;
  color: var(--warm-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sel-kind {
  font-size: 11px;
  color: var(--warm-500);
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
.st-btn:hover {
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
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
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 64px;
  text-align: right;
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
  display: flex;
  flex-direction: column;
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

<script setup lang="ts">
import { Minus, Plus, X } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import type { CartLine } from '../composables/useOpenAccountCart'

/**
 * Lista de cargos pendientes de registrar al abrir una cuenta, con su stepper
 * de cantidad. Sale de `OpenAccountModal` con sus 13 reglas de CSS.
 */
defineProps<{
  lines: CartLine[]
  lineLabel: (line: CartLine) => string
}>()

const emit = defineEmits<{
  setQty: [line: CartLine, qty: number]
  remove: [line: CartLine]
}>()
</script>
<template>
  <div class="cart">
    <div class="cart-head">Cargos a registrar</div>
    <ul v-if="lines.length" class="cart-list">
      <li v-for="line in lines" :key="line.uid" class="cart-row">
        <span class="cl-info">
          <span class="cl-name">{{ line.name }}</span>
          <span class="cl-tag">{{ lineLabel(line) }} · {{ formatMoney(line.unitPrice) }}</span>
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
        <span class="cl-total">{{ formatMoney(line.unitPrice * line.qty) }}</span>
        <button type="button" class="cl-remove" title="Quitar" @click="emit('remove', line)">
          <X :size="13" :stroke-width="1.9" />
        </button>
      </li>
    </ul>
    <div v-else class="cart-empty">Agrega al menos un cargo para abrir la cuenta.</div>
  </div>
</template>

<style scoped>
.cart-head {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 13px 16px;
  border-bottom: 1px solid var(--warm-200);
}

.cart-list {
  list-style: none;
  margin: 0;
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.cart-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--warm-100);
}

.cl-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.cl-name {
  font-size: 13px;
  color: var(--warm-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cl-tag {
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

.cl-total {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  min-width: 64px;
  text-align: right;
}

.cl-remove {
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

.cl-remove:hover {
  background: oklch(94% 0.05 25deg);
  color: var(--danger-700);
}

.cart-empty {
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: var(--warm-400);
}
</style>

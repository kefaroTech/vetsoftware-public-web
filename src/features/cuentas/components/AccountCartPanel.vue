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
  <div class="ds-frame">
    <div class="cart-head">Cargos a registrar</div>
    <ul v-if="lines.length" class="cart-list ds-list-reset ds-stack">
      <li v-for="line in lines" :key="line.uid" class="cart-row">
        <span class="cl-info ds-flex-fill ds-stack">
          <span class="cl-name ds-truncate">{{ line.name }}</span>
          <span class="ds-meta ds-meta--caption"
            >{{ lineLabel(line) }} · {{ formatMoney(line.unitPrice) }}</span
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
        <span class="cl-total ds-item-label ds-num">{{
          formatMoney(line.unitPrice * line.qty)
        }}</span>
        <!-- `aria-label` y no `title`: el mismo mecanismo que los dos botones del stepper
             de arriba, y con el sujeto dentro para que las filas no se anuncien iguales. -->
        <button
          type="button"
          class="cl-remove"
          :aria-label="`Quitar ${line.name} de los cargos a registrar`"
          @click="emit('remove', line)"
        >
          <X :size="13" :stroke-width="1.9" />
        </button>
      </li>
    </ul>
    <div v-else class="cart-empty">Agrega al menos un cargo para abrir la cuenta.</div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: .ds-stack, .ds-list-reset, .ds-flex-fill, .ds-truncate,
   .ds-item-label, .ds-num, .ds-meta(--caption).
   La caja es `.ds-frame` (marco que recorta su contenido): sus cuatro valores
   —`--surface` = `--warm-50`, `--border` = `--warm-200`, `--radius-lg` = 12px y
   `overflow: hidden`— son los mismos que declaraba el `.cart` local, así que la
   migración no cambia el aspecto. Vivía en el CSS scoped de `OpenAccountModal`
   y llegaba hasta aquí porque el scoped del padre sí alcanza el elemento raíz
   del hijo. */
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
  padding: 8px 12px 12px;
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
  gap: 1px;
}

.cl-name {
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
   en el template. Su forma `:hover:not(:disabled)` pesa (0,3,0) y gana al
   `.st-btn[data-v-…]` de (0,2,0); la base (0,1,0) pierde contra ese mismo
   selector, así que el reposo sigue siendo warm-200/warm-700 sin tocar nada.
   El guardián `:not(:disabled)` es inerte aquí: estos dos botones nunca se
   deshabilitan. */

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
  white-space: nowrap;
  min-width: 64px;
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

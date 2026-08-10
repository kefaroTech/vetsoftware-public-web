<script setup lang="ts">
import { Minus, Plus, Receipt, Trash2, User, X } from 'lucide-vue-next'
import { formatMoney } from '../composables/pricing'
import type { SaleLine } from '../types/tienda'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'

/**
 * Columna derecha del POS: cliente asociado, líneas del ticket y el resumen con
 * el botón de cobro.
 *
 * Sale de `POSView` junto con el catálogo (`PosCatalog`, ya extraído). El
 * desglose llega calculado: el POS y el cierre de cuenta comparten la regla
 * fiscal en `pricing`, y duplicarla aquí sería una copia de más.
 */
defineProps<{
  lines: SaleLine[]
  customer: OwnerResponse | null
  grossSubtotal: number
  promoSavings: number
  baseTotal: number
  taxRows: { name: string; amount: number }[]
  total: number
  chargeDisabled: boolean
}>()

const emit = defineEmits<{
  toggleCustomer: []
  inc: [line: SaleLine]
  dec: [line: SaleLine]
  remove: [line: SaleLine]
  charge: []
}>()
</script>

<template>
  <aside class="ticket">
    <header class="ticket-head">
      <Receipt :size="17" :stroke-width="1.7" />
      <span>Ticket de venta</span>
    </header>

    <button type="button" class="customer" @click="emit('toggleCustomer')">
      <User :size="14" :stroke-width="1.7" />
      <span>{{ customer ? customer.name : 'Asociar propietario (opcional)' }}</span>
      <X v-if="customer" :size="13" :stroke-width="1.8" class="cust-x" />
    </button>

    <div class="lines">
      <div v-if="lines.length === 0" class="lines-empty">
        <Receipt :size="26" :stroke-width="1.4" />
        <span>Agrega productos o servicios</span>
      </div>
      <div v-for="l in lines" :key="`${l.kind}-${l.id}`" class="line">
        <div class="line-info">
          <div class="line-name">
            <span v-if="l.kind === 'service'" class="line-tag">Servicio</span>{{ l.name }}
          </div>
          <div class="line-price">
            <span
              v-if="l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice"
              class="price-old"
            >
              {{ formatMoney(l.originalUnitPrice) }}
            </span>
            {{ formatMoney(l.unitPrice) }} c/u
          </div>
        </div>
        <div class="qty">
          <button type="button" @click="emit('dec', l)">
            <Minus :size="13" :stroke-width="2" />
          </button>
          <span>{{ l.qty }}</span>
          <button type="button" @click="emit('inc', l)">
            <Plus :size="13" :stroke-width="2" />
          </button>
        </div>
        <div class="line-total">{{ formatMoney(l.unitPrice * l.qty) }}</div>
        <button type="button" class="line-x" aria-label="Quitar" @click="emit('remove', l)">
          <Trash2 :size="13" :stroke-width="1.7" />
        </button>
      </div>
    </div>

    <div class="summary">
      <div class="srow">
        <span>Subtotal (IVA incl.)</span><span>{{ formatMoney(grossSubtotal) }}</span>
      </div>
      <div v-if="promoSavings > 0" class="srow savings">
        <span>Ahorro por promociones</span><span>−{{ formatMoney(promoSavings) }}</span>
      </div>
      <div class="srow">
        <span>Base gravable</span><span>{{ formatMoney(baseTotal) }}</span>
      </div>
      <div v-for="r in taxRows" :key="r.name" class="srow">
        <span>{{ r.name }} (incluido)</span><span>{{ formatMoney(r.amount) }}</span>
      </div>
      <div class="srow grand">
        <span>Total</span><span>{{ formatMoney(total) }}</span>
      </div>
      <button type="button" class="charge" :disabled="chargeDisabled" @click="emit('charge')">
        Cobrar {{ formatMoney(total) }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.ticket {
  position: sticky;
  top: 12px;
  display: flex;
  flex-direction: column;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  overflow: hidden;
}

.ticket-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--warm-200);
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}

.ticket-head svg {
  color: var(--amatista-600);
}

.customer {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 11px 18px;
  border: none;
  border-bottom: 1px solid var(--warm-150);
  background: var(--warm-100);
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-700);
  cursor: pointer;
}

.customer:hover {
  background: var(--warm-150);
}

.cust-x {
  margin-left: auto;
}

.lines {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 360px;
}

.lines-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--warm-400);
  font-size: 13px;
  padding: 40px 20px;
  text-align: center;
}

.line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 9px;
}

.line:hover {
  background: var(--warm-100);
}

.line-info {
  flex: 1;
  min-width: 0;
}

.line-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.line-tag {
  display: inline-block;
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 600;
  color: var(--amatista-700);
  background: var(--amatista-50);
  padding: 1px 5px;
  border-radius: 4px;
  margin-right: 6px;
  vertical-align: middle;
}

.line-price {
  font-size: 11px;
  color: var(--warm-500);
  margin-top: 1px;
}

/* En `POSView` esta regla era una sola y servía al catálogo y al ticket. Al
   partir la vista se fue con `PosCatalog` y el precio tachado del ticket se
   quedó sin estilo: aquí vuelve, idéntica. */
.price-old {
  font-size: 11px;
  color: var(--warm-400);
  text-decoration: line-through;
  margin-right: 6px;
  font-weight: 400;
}

.qty {
  display: flex;
  align-items: center;
  border: 1px solid var(--warm-200);
  border-radius: 7px;
  overflow: hidden;
}

.qty button {
  width: 24px;
  height: 26px;
  border: none;
  background: var(--warm-100);
  color: var(--warm-700);
  cursor: pointer;
  display: grid;
  place-items: center;
}

.qty button:hover {
  background: var(--warm-200);
}

.qty span {
  min-width: 26px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
}

.line-total {
  font-size: 13px;
  font-weight: 600;
  color: var(--warm-900);
  min-width: 64px;
  text-align: right;
}

.line-x {
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: var(--warm-400);
  cursor: pointer;
  border-radius: 6px;
  display: grid;
  place-items: center;
}

.line-x:hover {
  background: oklch(94% 0.05 25deg);
  color: var(--danger-700);
}

.summary {
  border-top: 1px solid var(--warm-200);
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.srow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--warm-600);
}

.srow.savings {
  color: oklch(45% 0.13 150deg);
}

.srow.grand {
  font-size: 17px;
  font-weight: 600;
  color: var(--warm-900);
  padding-top: 7px;
  margin-top: 3px;
  border-top: 1px solid var(--warm-150);
}

.charge {
  margin-top: 10px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: var(--gradient-primary);
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.charge:hover:not(:disabled) {
  filter: brightness(1.05);
}

.charge:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (width <= 760px) {
  .ticket {
    position: static;
  }
}
</style>

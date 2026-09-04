<script setup lang="ts">
import { Minus, Plus, Receipt, Trash2, User, X } from 'lucide-vue-next'
import { formatMoney } from '../composables/pricing'
import type { SaleLine } from '../types/tienda'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'

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
  <aside class="ticket ds-stack">
    <header class="ticket-head ds-item-label ds-item-label--lg">
      <Receipt :size="17" :stroke-width="1.7" />
      <span>Ticket de venta</span>
    </header>

    <button type="button" class="customer ds-flex-row" @click="emit('toggleCustomer')">
      <User :size="14" :stroke-width="1.7" />
      <span>{{ customer ? customer.name : 'Asociar propietario (opcional)' }}</span>
      <X v-if="customer" :size="13" :stroke-width="1.8" class="cust-x" />
    </button>

    <div class="lines ds-stack">
      <div v-if="lines.length === 0" class="lines-empty ds-stack ds-stack--10">
        <Receipt :size="26" :stroke-width="1.4" />
        <span>Agrega productos o servicios</span>
      </div>
      <div v-for="l in lines" :key="`${l.kind}-${l.id}`" class="line ds-flex-row">
        <div class="ds-flex-fill">
          <div class="ds-item-label">
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
          <button
            type="button"
            :aria-label="`Quitar una unidad de ${l.name}`"
            @click="emit('dec', l)"
          >
            <Minus :size="13" :stroke-width="2" />
          </button>
          <span>{{ l.qty }}</span>
          <button
            type="button"
            :aria-label="`Añadir una unidad de ${l.name}`"
            @click="emit('inc', l)"
          >
            <Plus :size="13" :stroke-width="2" />
          </button>
        </div>
        <div class="line-total ds-strong">{{ formatMoney(l.unitPrice * l.qty) }}</div>
        <!-- El nombre accesible lleva el sujeto: con «Quitar» a secas las N filas del
             ticket se anuncian idénticas y el lector no distingue qué se está borrando. -->
        <button
          type="button"
          class="line-x"
          :aria-label="`Quitar ${l.name} del ticket`"
          @click="emit('remove', l)"
        >
          <Trash2 :size="13" :stroke-width="1.7" />
        </button>
      </div>
    </div>

    <div class="summary ds-stack">
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
      <button
        type="button"
        class="charge"
        :class="{ 'ds-is-disabled': chargeDisabled }"
        :disabled="chargeDisabled"
        @click="emit('charge')"
      >
        Cobrar {{ formatMoney(total) }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* La columna es `.ds-stack` (primitives.css). NO es `.ds-card`: la tarjeta del
   sistema trae padding propio y el ticket pinta sus secciones a sangre, con las
   separaciones puestas por los bordes internos de cada bloque. */
.ticket {
  position: sticky;
  top: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  overflow: hidden;
}

/* El par color+tamaño+peso es `.ds-item-label ds-item-label--lg`; el `gap: 9px`
   no es ninguna de las dos variantes catalogadas (8/12) de `.ds-flex-row`, así
   que la fila se queda local para no dejar una regla compitiendo con ella. */
.ticket-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--warm-200);
}

.ticket-head svg {
  color: var(--amatista-600);
}

.customer {
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
  gap: 4px;
  max-height: 360px;
}

/* NO es `.ds-empty`: aquí el gris es `warm-400` (un escalón más claro que el
   `--text-subtle` de la primitiva) y el aire es 40/20, no 32. Sólo se comparte
   la columna centrada, que sí es `.ds-stack ds-stack--10`. */
.lines-empty {
  flex: 1;
  align-items: center;
  justify-content: center;
  color: var(--warm-400);
  font-size: 13px;
  padding: 40px 20px;
  text-align: center;
}

.line {
  padding: 9px 10px;
  border-radius: 9px;
}

.line:hover {
  background: var(--warm-100);
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
  background: var(--danger-150);
  color: var(--danger-700);
}

.summary {
  border-top: 1px solid var(--warm-200);
  padding: 14px 18px;
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
  color: var(--compras-ok-fg);
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
  color: var(--warm-50);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* El apagado es `.ds-is-disabled`, atado al mismo booleano que el atributo
   nativo. NO se migra a `.ds-btn--primary`: la primitiva lleva borde de 1px y
   este botón va a `border: none`, así que heredarla le añadiría 2px de alto al
   CTA más visible del punto de venta. */
.charge:hover:not(:disabled) {
  filter: brightness(1.05);
}

@media (width <= 760px) {
  .ticket {
    position: static;
  }
}
</style>

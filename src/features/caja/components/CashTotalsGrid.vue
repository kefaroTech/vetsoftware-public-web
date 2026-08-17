<script setup lang="ts">
import { formatMoney, methodLabel } from '../composables/useCaja'
import type { MethodTotal } from '../types/caja'

/**
 * Rejilla de cifras esperadas de una sesión: base inicial + un total por medio
 * de pago.
 *
 * Estaba escrita dos veces —`MyCashPanel` y `CashSessionDetailModal`— con el
 * mismo marcado y las mismas seis reglas (`.totals`, `.total-card`, `.base`,
 * `.lbl`, `.val`). La única diferencia era el sufijo "(esperado)" del rótulo, y
 * eso es una prop.
 *
 * No calcula nada: los importes llegan ya resueltos y se pintan con el mismo
 * `formatMoney` del feature.
 */
defineProps<{
  openingFloat: number
  totals: MethodTotal[]
  /** Añade "(esperado)" al rótulo de cada medio de pago. */
  expected?: boolean
}>()
</script>

<template>
  <div class="cash-totals">
    <div class="total-card base">
      <span class="lbl">Base inicial</span>
      <span class="val">{{ formatMoney(openingFloat) }}</span>
    </div>
    <div v-for="total in totals" :key="total.method" class="total-card">
      <span class="lbl">
        {{ expected ? methodLabel(total.method) + ' (esperado)' : methodLabel(total.method) }}
      </span>
      <span class="val">{{ formatMoney(total.expectedAmount) }}</span>
    </div>
  </div>
</template>

<style scoped>
.cash-totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-12);
}

.total-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-12) var(--space-14);
  border-radius: var(--radius-panel);
  background: var(--warm-100);
}

.total-card.base {
  background: var(--amatista-100);
}

.total-card .lbl {
  color: var(--warm-500);
  font-size: var(--text-caption);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.total-card .val {
  color: var(--warm-900);
  font-size: var(--text-h3);
  font-weight: 700;
}
</style>

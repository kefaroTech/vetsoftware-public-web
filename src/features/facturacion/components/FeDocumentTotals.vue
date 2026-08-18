<script setup lang="ts">
import { computed } from 'vue'
import { feMoney } from '../composables/feFormat'
import { PAYMENT_MEANS_LABEL, type ElectronicDocumentResponse } from '../types/facturacion'

/**
 * Tarjeta de totales del documento electrónico: base, impuestos, retenciones del
 * adquiriente y neto a pagar.
 *
 * Sale de `FeDocumentDetail` con sus 7 reglas de CSS. El bloque de retenciones
 * sólo aparece si alguna de las tres es mayor que cero, igual que antes.
 */
const props = defineProps<{ doc: ElectronicDocumentResponse }>()

const hasReten = computed(
  () =>
    props.doc.reteFuenteAmount > 0 || props.doc.reteIvaAmount > 0 || props.doc.reteIcaAmount > 0,
)
</script>

<template>
  <div class="ds-card totals ds-stack">
    <div class="tot-row">
      <span>Subtotal (base)</span><span>{{ feMoney(doc.lineExtensionAmount) }}</span>
    </div>
    <div class="tot-row">
      <span>Total con impuestos</span><span>{{ feMoney(doc.taxInclusiveAmount) }}</span>
    </div>
    <div class="tot-row sub">
      <span>Total a pagar</span><span>{{ feMoney(doc.payableAmount) }}</span>
    </div>
    <template v-if="hasReten">
      <div class="reten-head">Retenciones del adquiriente</div>
      <div v-if="doc.reteFuenteAmount > 0" class="tot-row reten">
        <span>ReteFuente</span><span>−{{ feMoney(doc.reteFuenteAmount) }}</span>
      </div>
      <div v-if="doc.reteIvaAmount > 0" class="tot-row reten">
        <span>ReteIVA</span><span>−{{ feMoney(doc.reteIvaAmount) }}</span>
      </div>
      <div v-if="doc.reteIcaAmount > 0" class="tot-row reten">
        <span>ReteICA</span><span>−{{ feMoney(doc.reteIcaAmount) }}</span>
      </div>
      <div class="tot-row net">
        <span>Neto a pagar</span><span>{{ feMoney(doc.netPayableAmount) }}</span>
      </div>
    </template>
    <div class="tot-pay ds-meta">
      {{ doc.paymentForm === 'CONTADO' ? 'Contado' : 'Crédito' }}
      <template v-for="p in doc.payments" :key="p.id">
        · {{ PAYMENT_MEANS_LABEL[p.paymentMeans] }}</template
      >
    </div>
  </div>
</template>

<style scoped>
/* Layout via primitivas: `.ds-card`, `.ds-stack` y `.ds-meta`. */
.totals {
  gap: 7px;
}

.tot-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--warm-700);
  font-variant-numeric: tabular-nums;
}

.tot-row.sub {
  font-weight: 700;
  color: var(--warm-900);
  padding-top: 7px;
  border-top: 1px solid var(--warm-200);
}

.reten-head {
  margin-top: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.tot-row.reten {
  color: oklch(50% 0.16 25deg);
}

.tot-row.net {
  font-weight: 700;
  color: var(--warm-900);
  padding-top: 6px;
  border-top: 1px solid var(--warm-200);
}

.tot-pay {
  margin-top: 8px;
}

/* Override mínimo sobre `.ds-card`. */
.ds-card {
  padding: 18px 20px;
}
</style>

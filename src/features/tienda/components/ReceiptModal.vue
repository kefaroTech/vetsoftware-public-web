<script setup lang="ts">
import { Check, Printer } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { formatMoney, type TotalsBreakdown } from '../composables/pricing'
import type { SaleLine } from '../types/tienda'
import { useReceiptPrint } from '@/composables/useReceiptPrint'

const props = defineProps<{
  open: boolean
  lines: SaleLine[]
  totals: TotalsBreakdown
  method: string
  change: number | null
}>()

defineEmits<{ close: [] }>()

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
}

const { printReceipt } = useReceiptPrint()

function onPrint() {
  const summary = [
    { label: 'Base gravable', value: formatMoney(props.totals.net) },
    ...(props.totals.promoSavings > 0
      ? [{ label: 'Ahorro por promociones', value: `- ${formatMoney(props.totals.promoSavings)}` }]
      : []),
    { label: 'IVA (incluido)', value: formatMoney(props.totals.tax) },
    { label: 'Total', value: formatMoney(props.totals.total), emphasis: true },
  ]
  printReceipt({
    header: {
      companyName: 'Vetrina',
      dateTime: new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    title: 'Recibo de venta',
    lines: props.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      amount: formatMoney(l.unitPrice * l.qty),
    })),
    summary,
    payment: {
      method: METHOD_LABEL[props.method] ?? props.method,
      change: props.change != null ? formatMoney(props.change) : undefined,
    },
    footer: 'Comprobante de venta — no válido como factura',
  })
}
</script>

<template>
  <ModalShell :open="open" title="Recibo" subtitle="Venta registrada (demo, no persistida)" :icon="Check" :width="460" @close="$emit('close')">
    <template #body>
      <div class="receipt">
        <ul class="lines">
          <li v-for="l in lines" :key="`${l.kind}-${l.id}`" class="line">
            <span class="ln-name">{{ l.name }} <span class="ln-qty">×{{ l.qty }}</span></span>
            <span class="ln-amount">{{ formatMoney(l.unitPrice * l.qty) }}</span>
          </li>
        </ul>
        <div class="summary">
          <div class="srow"><span>Base gravable</span><span>{{ formatMoney(totals.net) }}</span></div>
          <div v-if="totals.promoSavings > 0" class="srow saving"><span>Ahorro por promociones</span><span>− {{ formatMoney(totals.promoSavings) }}</span></div>
          <div class="srow"><span>IVA (incluido)</span><span>{{ formatMoney(totals.tax) }}</span></div>
          <div class="srow total"><span>Total</span><span>{{ formatMoney(totals.total) }}</span></div>
          <div class="srow"><span>Método</span><span>{{ METHOD_LABEL[method] ?? method }}</span></div>
          <div v-if="change != null" class="srow"><span>Cambio</span><span>{{ formatMoney(change) }}</span></div>
        </div>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="onPrint">
        <Printer :size="15" :stroke-width="2" /> Imprimir
      </button>
      <button type="button" class="btn-primary" @click="$emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.receipt { font-family: var(--font-sans); }
.lines { list-style: none; margin: 0 0 14px; padding: 0 0 14px; border-bottom: 1px dashed var(--warm-300); display: flex; flex-direction: column; gap: 8px; }
.line { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; color: var(--warm-800); }
.ln-qty { color: var(--warm-500); font-size: 12px; }
.summary { display: flex; flex-direction: column; gap: 8px; }
.srow { display: flex; align-items: center; justify-content: space-between; font-size: 13.5px; color: var(--warm-700); }
.srow.saving { color: oklch(45% 0.13 150); }
.srow.total { font-size: 16px; font-weight: 600; color: var(--warm-900); padding-top: 8px; border-top: 1px solid var(--warm-200); }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 16px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--warm-300); background: white; color: var(--warm-800);
}
.btn-ghost:hover { border-color: var(--warm-400); background: var(--warm-50); }
</style>

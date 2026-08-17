<script setup lang="ts">
import { computed } from 'vue'
import { Check, Printer } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import { formatMoney, type TotalsBreakdown } from '../composables/pricing'
import type { SaleLine } from '../types/tienda'
import { useReceiptPrint } from '@/composables/useReceiptPrint'
import type { ReceiptLine, ReceiptTotalRow } from '@/composables/useReceiptPrint'
import { buildDocumentReceiptTicket } from '@/composables/buildDocumentReceipt'
import { useReceiptSettings } from '@/composables/useReceiptSettings'
import FeStatusPill from '@/features/facturacion/components/FeStatusPill.vue'
import type { ElectronicDocumentResponse } from '@/features/facturacion/types/facturacion'

const props = defineProps<{
  open: boolean
  lines: SaleLine[]
  totals: TotalsBreakdown
  method: string
  change: number | null
  document?: ElectronicDocumentResponse | null
}>()

defineEmits<{ close: [] }>()

const METHOD_LABEL: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
}

// Número fiscal (prefijo-consecutivo) cuando el documento ya fue numerado por la DIAN.
const docNumber = computed(() => {
  const d = props.document
  if (!d || d.consecutive == null) return null
  return `${d.prefix ?? ''}${d.consecutive}`
})

const { printReceipt } = useReceiptPrint()
const { width, setWidth } = useReceiptSettings()

// Quita el código DIAN entre paréntesis de las etiquetas (p.ej. "Efectivo (10)" → "Efectivo").
const cleanLabel = (s: string) => s.replace(/\s*\(\d+\)\s*$/, '')

function onPrint() {
  // Documento fiscal → recibo canónico (mismo builder que el cierre de cuenta).
  if (props.document) {
    printReceipt(
      buildDocumentReceiptTicket(props.document, { width: width.value, change: props.change }),
    )
    return
  }

  // Fallback sin documento (raro en POS): arma el recibo desde el carrito, con el mismo layout.
  const lines: ReceiptLine[] = props.lines.map((l) => ({
    qty: `${l.qty}×`,
    desc: l.name,
    sub: l.qty > 1 ? `· ${formatMoney(l.unitPrice)} c/u` : undefined,
    amount: formatMoney(l.unitPrice * l.qty),
  }))
  const totals: ReceiptTotalRow[] = [
    { label: 'Subtotal (base)', value: formatMoney(props.totals.net), kind: 'muted' },
    ...(props.totals.tax > 0
      ? [{ label: 'IVA', value: formatMoney(props.totals.tax), kind: 'muted' as const }]
      : []),
    { label: 'TOTAL', value: formatMoney(props.totals.total), kind: 'grand' as const },
  ]
  const tender: ReceiptTotalRow[] = []
  if (props.change != null) {
    tender.push({
      label: 'Recibido',
      value: formatMoney(props.totals.total + props.change),
      kind: 'pay',
    })
    tender.push({ label: 'Cambio', value: formatMoney(props.change), kind: 'change' })
  }
  printReceipt({
    width: width.value,
    brand: { name: 'Vetrina' },
    docType: 'Comprobante de venta',
    docNumber: '—',
    meta: [
      {
        label: 'Fecha',
        value: new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
      },
    ],
    lines,
    totals,
    payPill: `${cleanLabel(METHOD_LABEL[props.method] ?? props.method)} · Contado`,
    tender,
    footer: { thanks: 'Gracias por su compra, vuelva pronto' },
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Recibo"
    subtitle="Venta registrada"
    :icon="Check"
    :width="460"
    @close="$emit('close')"
  >
    <template #body>
      <div class="receipt">
        <div v-if="document" class="fe-doc ds-stack">
          <div class="fe-doc-row">
            <span class="fe-doc-lab">Documento DIAN</span>
            <FeStatusPill :status="document.dianStatus" />
          </div>
          <div v-if="docNumber" class="fe-doc-num ds-strong">N.º {{ docNumber }}</div>
          <p v-else-if="document.dianStatus === 'PENDIENTE'" class="fe-doc-hint">
            Datos guardados. La emisión a la DIAN queda pendiente (módulo de facturación no
            habilitado).
          </p>
        </div>
        <ul class="lines ds-stack ds-stack--8">
          <li v-for="l in lines" :key="`${l.kind}-${l.id}`" class="line">
            <span class="ln-name"
              >{{ l.name }} <span class="ds-meta">×{{ l.qty }}</span></span
            >
            <span class="ln-amount">{{ formatMoney(l.unitPrice * l.qty) }}</span>
          </li>
        </ul>
        <div class="ds-stack ds-stack--8">
          <div class="srow">
            <span>Base gravable</span><span>{{ formatMoney(totals.net) }}</span>
          </div>
          <div v-if="totals.promoSavings > 0" class="srow saving">
            <span>Ahorro por promociones</span><span>− {{ formatMoney(totals.promoSavings) }}</span>
          </div>
          <div class="srow">
            <span>IVA (incluido)</span><span>{{ formatMoney(totals.tax) }}</span>
          </div>
          <div class="srow total">
            <span>Total</span><span>{{ formatMoney(totals.total) }}</span>
          </div>
          <div class="srow">
            <span>Método</span><span>{{ METHOD_LABEL[method] ?? method }}</span>
          </div>
          <div v-if="change != null" class="srow">
            <span>Cambio</span><span>{{ formatMoney(change) }}</span>
          </div>
        </div>
      </div>
    </template>
    <template #footer-left>
      <div class="w-seg" role="group" aria-label="Ancho del tiquete">
        <button type="button" :class="{ on: width === '80' }" @click="setWidth('80')">80mm</button>
        <button type="button" :class="{ on: width === '58' }" @click="setWidth('58')">58mm</button>
      </div>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="onPrint">
        <Printer :size="15" :stroke-width="2" /> Imprimir
      </button>
      <button type="button" class="ds-btn ds-btn--primary ds-btn--lg" @click="$emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.receipt {
  font-family: var(--font-sans);
}
.fe-doc {
  gap: 7px;
  padding: 12px 14px;
  margin-bottom: 14px;
  border-radius: 11px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-100);
}
.fe-doc-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.fe-doc-lab {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warm-700);
}
.fe-doc-num {
  font-size: 13px;
}
.fe-doc-hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--warm-600);
  line-height: 1.4;
}

/* La columna es `.ds-stack ds-stack--8`. NO lleva `.ds-list-reset`: esa
   primitiva pone `margin`/`padding` a 0 y esta lista necesita 14px por debajo
   para separarse del filete de puntos, así que sólo se aprovecharía el
   `list-style` a cambio de dejar dos reglas compitiendo. */
.lines {
  list-style: none;
  margin: 0 0 14px;
  padding: 0 0 14px;
  border-bottom: 1px dashed var(--warm-300);
}
.line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--warm-800);
}

/* `.summary` desapareció entera: era `.ds-stack ds-stack--8`. */
.srow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
  color: var(--warm-700);
}
.srow.saving {
  color: oklch(45% 0.13 150deg);
}
.srow.total {
  font-size: 16px;
  font-weight: 600;
  color: var(--warm-900);
  padding-top: 8px;
  border-top: 1px solid var(--warm-200);
}

/* NO es `.ds-btn--ghost`: aquí el borde es `warm-300`, el fondo blanco opaco y
   el texto `warm-800`, y al pasar el ratón oscurece el borde en vez de rellenar.
   Migrarlo aclararía el botón "Imprimir" — queda anotado en el informe. */
.btn-ghost {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  padding: 10px 16px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid var(--warm-300);
  background: white;
  color: var(--warm-800);
}
.btn-ghost:hover {
  border-color: var(--warm-400);
  background: var(--warm-50);
}
.w-seg {
  display: inline-flex;
  border: 1px solid var(--warm-300);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.w-seg button {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 5px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--warm-600);
}

/* Mismo cuerpo que el hover de un botón fantasma, pero esto es un ESTADO
   activo: el ancho de tiquete elegido. No es `.ds-btn--plain`. */
.w-seg button.on {
  background: var(--warm-100);
  color: var(--warm-900);
}
</style>

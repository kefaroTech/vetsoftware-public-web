<script setup lang="ts">
import { computed } from 'vue'
import { Check, Printer } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { formatMoney, type TotalsBreakdown } from '../composables/pricing'
import type { SaleLine } from '../types/tienda'
import { useReceiptPrint } from '@/composables/useReceiptPrint'
import type { ReceiptLine, ReceiptTotalRow } from '@/composables/useReceiptPrint'
import { useReceiptSettings } from '@/composables/useReceiptSettings'
import FeStatusPill from '@/features/facturacion/components/FeStatusPill.vue'
import {
  COMPANY_DOCTYPE_LABEL,
  DOC_TYPE_LABEL,
  PAYMENT_FORM_LABEL,
  PAYMENT_MEANS_LABEL,
  TAX_REGIME_LABEL,
  type CompanyDocumentType,
  type ElectronicDocumentResponse,
  type TaxRegime,
} from '@/features/facturacion/types/facturacion'

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
  const doc = props.document
  const issuer = doc?.issuer
  const total = doc ? doc.payableAmount : props.totals.total

  // Bloque fiscal del emisor (lo que trae el snapshot del documento).
  const fiscal: string[] = []
  if (issuer) {
    const docTypeShort = cleanLabel(
      COMPANY_DOCTYPE_LABEL[issuer.documentType as CompanyDocumentType] ?? issuer.documentType,
    )
    const taxId = `${docTypeShort} ${issuer.documentId}${issuer.verificationDigit ? `-${issuer.verificationDigit}` : ''}`
    const regime = issuer.taxRegime
      ? TAX_REGIME_LABEL[issuer.taxRegime as TaxRegime] ?? issuer.taxRegime
      : null
    fiscal.push(regime ? `${taxId} · ${regime}` : taxId)
    if (issuer.email) fiscal.push(issuer.email)
  }

  // Datos del documento.
  const meta: { label: string; value: string }[] = []
  if (doc) {
    meta.push({ label: 'Fecha', value: `${doc.issueDate} ${(doc.issueTime ?? '').slice(0, 5)}`.trim() })
    const cust = doc.customer
    const custName = cust?.name || cust?.legalName
    if (custName) meta.push({ label: 'Cliente', value: custName })
    if (cust?.documentId) {
      meta.push({
        label: 'Documento',
        value: `${cust.documentId}${cust.verificationDigit ? `-${cust.verificationDigit}` : ''}`,
      })
    }
  } else {
    meta.push({
      label: 'Fecha',
      value: new Date().toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }),
    })
  }

  // Detalle: líneas del documento (autoritativo) o, en su defecto, del carrito.
  const lines: ReceiptLine[] = doc
    ? doc.lines.map((l) => ({
        qty: `${l.quantity}×`,
        desc: l.description,
        sub: l.quantity > 1 ? `· ${formatMoney(l.unitPrice)} c/u` : undefined,
        amount: formatMoney(l.totalAmount),
      }))
    : props.lines.map((l) => ({
        qty: `${l.qty}×`,
        desc: l.name,
        sub: l.qty > 1 ? `· ${formatMoney(l.unitPrice)} c/u` : undefined,
        amount: formatMoney(l.unitPrice * l.qty),
      }))

  // Totales (desglose). El IVA va incluido en los precios; se muestra extraído.
  const iva = doc ? doc.taxInclusiveAmount - doc.taxExclusiveAmount : props.totals.tax
  const base = doc ? doc.taxExclusiveAmount : props.totals.net
  const totals: ReceiptTotalRow[] = [
    { label: 'Subtotal (base)', value: formatMoney(base), kind: 'muted' },
    ...(iva > 0 ? [{ label: 'IVA', value: formatMoney(iva), kind: 'muted' as const }] : []),
    { label: 'TOTAL', value: formatMoney(total), kind: 'grand' as const },
  ]

  // Medio de pago + recibido/cambio.
  const meansLabel =
    doc && doc.payments.length
      ? cleanLabel(PAYMENT_MEANS_LABEL[doc.payments[0].paymentMeans] ?? doc.payments[0].paymentMeans)
      : cleanLabel(METHOD_LABEL[props.method] ?? props.method)
  const formLabel = doc ? PAYMENT_FORM_LABEL[doc.paymentForm] ?? doc.paymentForm : 'Contado'
  const tender: ReceiptTotalRow[] = []
  if (props.change != null) {
    tender.push({ label: 'Recibido', value: formatMoney(total + props.change), kind: 'pay' })
    tender.push({ label: 'Cambio', value: formatMoney(props.change), kind: 'change' })
  }

  // Sello DIAN: solo cuando el documento ya fue validado (tiene CUFE/CUDE).
  const seal = doc?.cufe ?? doc?.cude ?? null
  const dian =
    doc && seal
      ? {
          sealLabel: doc.cufe ? 'CUFE' : 'CUDE',
          seal,
          info: doc.dianValidationDate
            ? [`Validado DIAN ${doc.dianValidationDate.slice(0, 16).replace('T', ' ')}`]
            : undefined,
        }
      : undefined

  printReceipt({
    width: width.value,
    brand: { name: issuer?.legalName || 'Vetrina' },
    fiscal,
    docType: doc ? DOC_TYPE_LABEL[doc.documentType] ?? 'Comprobante' : 'Comprobante de venta',
    docNumber: docNumber.value ?? (doc ? `Interno ${doc.id}` : '—'),
    meta,
    lines,
    totals,
    payPill: `${meansLabel} · ${formLabel}`,
    tender,
    dian,
    footer: {
      thanks: 'Gracias por su compra, vuelva pronto',
      lines: docNumber.value ? undefined : ['Comprobante de venta · emisión a la DIAN pendiente'],
    },
  })
}
</script>

<template>
  <ModalShell :open="open" title="Recibo" subtitle="Venta registrada" :icon="Check" :width="460" @close="$emit('close')">
    <template #body>
      <div class="receipt">
        <div v-if="document" class="fe-doc">
          <div class="fe-doc-row">
            <span class="fe-doc-lab">Documento DIAN</span>
            <FeStatusPill :status="document.dianStatus" />
          </div>
          <div v-if="docNumber" class="fe-doc-num">N.º {{ docNumber }}</div>
          <p v-else-if="document.dianStatus === 'PENDIENTE'" class="fe-doc-hint">
            Datos guardados. La emisión a la DIAN queda pendiente (módulo de facturación no habilitado).
          </p>
        </div>
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
      <button type="button" class="btn-primary" @click="$emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.receipt { font-family: var(--font-sans); }
.fe-doc { display: flex; flex-direction: column; gap: 7px; padding: 12px 14px; margin-bottom: 14px; border-radius: 11px; background: var(--amatista-50); border: 1px solid var(--amatista-100); }
.fe-doc-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.fe-doc-lab { font-size: 12.5px; font-weight: 600; color: var(--warm-700); }
.fe-doc-num { font-size: 13px; font-weight: 600; color: var(--warm-900); }
.fe-doc-hint { margin: 0; font-size: 11.5px; color: var(--warm-600); line-height: 1.4; }
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
.w-seg { display: inline-flex; border: 1px solid var(--warm-300); border-radius: 8px; padding: 2px; gap: 2px; }
.w-seg button {
  font-family: inherit; font-size: 12px; font-weight: 500; padding: 5px 10px; border-radius: 6px; cursor: pointer;
  border: none; background: transparent; color: var(--warm-600);
}
.w-seg button.on { background: var(--warm-100); color: var(--warm-900); }
</style>

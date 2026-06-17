<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, FileMinus, FilePlus, RefreshCw, RefreshCcw, Copy } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import FeStatusPill from './FeStatusPill.vue'
import {
  DOC_TYPE_LABEL,
  PAYMENT_FORM_LABEL,
  PAYMENT_MEANS_LABEL,
  type ElectronicDocumentResponse,
} from '../types/facturacion'

const props = defineProps<{ doc: ElectronicDocumentResponse }>()
const emit = defineEmits<{
  back: []
  transmit: [id: number]
  convert: [id: number]
  creditNote: [id: number]
  debitNote: [id: number]
}>()

const toast = useToast()
const { can } = useFacturacionAccess()

const d = computed(() => props.doc)
const number = computed(() => `${d.value.prefix ?? '—'}-${d.value.consecutive ?? '—'}`)
const hasWithholding = computed(
  () => d.value.reteFuenteAmount > 0 || d.value.reteIvaAmount > 0 || d.value.reteIcaAmount > 0,
)
const isNote = computed(
  () => d.value.documentType === 'NOTA_CREDITO' || d.value.documentType === 'NOTA_DEBITO',
)

const canEmit = computed(() => can(PERMISSIONS.ELECTRONIC_DOCUMENT_EMIT))
const canTransmit = computed(() => can(PERMISSIONS.ELECTRONIC_DOCUMENT_TRANSMIT))

const showTransmit = computed(() => canTransmit.value && d.value.dianStatus === 'CONTINGENCIA')
const showNotes = computed(
  () => canEmit.value && d.value.dianStatus === 'VALIDADO' && !isNote.value && !d.value.reversed,
)
const showConvert = computed(
  () => canEmit.value && d.value.documentType === 'DOC_EQUIV_POS' && d.value.dianStatus === 'VALIDADO',
)

function copy(text: string | null) {
  if (!text) return
  void navigator.clipboard?.writeText(text)
  toast.success('Copiado', 'Se copió al portapapeles.')
}
</script>

<template>
  <div class="detail">
    <button type="button" class="back" @click="emit('back')">
      <ArrowLeft :size="15" :stroke-width="1.8" /> Volver a documentos
    </button>

    <header class="head">
      <div>
        <div class="num">{{ number }}</div>
        <div class="type">{{ DOC_TYPE_LABEL[d.documentType] }}</div>
      </div>
      <FeStatusPill :status="d.dianStatus" />
    </header>

    <div v-if="d.reversed" class="reversed-banner">Esta factura fue anulada por una nota crédito.</div>

    <div class="actions" v-if="showTransmit || showNotes || showConvert">
      <button v-if="showTransmit" type="button" class="act" @click="emit('transmit', d.id)">
        <RefreshCw :size="14" :stroke-width="1.8" /> Re-transmitir
      </button>
      <button v-if="showConvert" type="button" class="act" @click="emit('convert', d.id)">
        <RefreshCcw :size="14" :stroke-width="1.8" /> Convertir a factura
      </button>
      <button v-if="showNotes" type="button" class="act" @click="emit('creditNote', d.id)">
        <FileMinus :size="14" :stroke-width="1.8" /> Nota crédito
      </button>
      <button v-if="showNotes" type="button" class="act" @click="emit('debitNote', d.id)">
        <FilePlus :size="14" :stroke-width="1.8" /> Nota débito
      </button>
    </div>

    <div class="grid">
      <!-- Identidad fiscal -->
      <section class="card">
        <h3>Adquiriente</h3>
        <dl>
          <div><dt>Nombre</dt><dd>{{ d.customer.legalName || d.customer.name || '—' }}</dd></div>
          <div><dt>Documento</dt><dd>{{ d.customer.documentType }} {{ d.customer.documentId }}<span v-if="d.customer.verificationDigit">-{{ d.customer.verificationDigit }}</span></dd></div>
          <div v-if="d.customer.email"><dt>Correo</dt><dd>{{ d.customer.email }}</dd></div>
        </dl>
        <h3 class="mt">Emisor</h3>
        <dl>
          <div><dt>Razón social</dt><dd>{{ d.issuer.legalName || '—' }}</dd></div>
          <div><dt>Documento</dt><dd>{{ d.issuer.documentType }} {{ d.issuer.documentId }}<span v-if="d.issuer.verificationDigit">-{{ d.issuer.verificationDigit }}</span></dd></div>
        </dl>
      </section>

      <!-- DIAN / fechas -->
      <section class="card">
        <h3>DIAN</h3>
        <dl>
          <div><dt>Fecha</dt><dd>{{ d.issueDate }} {{ d.issueTime }}</dd></div>
          <div v-if="d.cufe"><dt>CUFE</dt><dd class="mono">{{ d.cufe.slice(0, 24) }}… <button class="copy" @click="copy(d.cufe)"><Copy :size="12" /></button></dd></div>
          <div v-if="d.cude"><dt>CUDE</dt><dd class="mono">{{ d.cude.slice(0, 24) }}… <button class="copy" @click="copy(d.cude)"><Copy :size="12" /></button></dd></div>
          <div v-if="d.dianValidationDate"><dt>Validado</dt><dd>{{ d.dianValidationDate.slice(0, 19).replace('T', ' ') }}</dd></div>
          <div><dt>Pago</dt><dd>{{ PAYMENT_FORM_LABEL[d.paymentForm] }}</dd></div>
          <div v-if="isNote && d.reference"><dt>Corrige</dt><dd>{{ d.reference.prefix }}-{{ d.reference.number }}</dd></div>
          <div v-if="isNote && d.noteReasonText"><dt>Motivo</dt><dd>{{ d.noteReasonText }}</dd></div>
        </dl>
        <div v-if="d.qrUrl" class="qr">
          <img :src="d.qrUrl" alt="QR DIAN" />
        </div>
      </section>
    </div>

    <!-- Líneas -->
    <section class="card">
      <h3>Líneas</h3>
      <table class="lines">
        <thead><tr><th>#</th><th>Descripción</th><th class="r">Cant.</th><th class="r">Unitario</th><th class="r">Base</th><th class="r">IVA</th><th class="r">Total</th></tr></thead>
        <tbody>
          <tr v-for="l in d.lines" :key="l.lineNumber">
            <td>{{ l.lineNumber }}</td>
            <td>{{ l.description }}</td>
            <td class="r">{{ l.quantity }}</td>
            <td class="r">{{ formatMoney(l.unitPrice) }}</td>
            <td class="r">{{ formatMoney(l.lineExtensionAmount) }}</td>
            <td class="r">{{ formatMoney(l.taxAmount) }}</td>
            <td class="r">{{ formatMoney(l.totalAmount) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Totales -->
    <section class="card totals">
      <div class="trow"><span>Base</span><span>{{ formatMoney(d.lineExtensionAmount) }}</span></div>
      <div class="trow"><span>IVA / INC</span><span>{{ formatMoney(d.taxInclusiveAmount - d.lineExtensionAmount) }}</span></div>
      <div class="trow strong"><span>Total</span><span>{{ formatMoney(d.payableAmount) }}</span></div>
      <template v-if="hasWithholding">
        <div class="trow sub"><span>ReteFuente</span><span>−{{ formatMoney(d.reteFuenteAmount) }}</span></div>
        <div class="trow sub"><span>ReteIVA</span><span>−{{ formatMoney(d.reteIvaAmount) }}</span></div>
        <div class="trow sub"><span>ReteICA</span><span>−{{ formatMoney(d.reteIcaAmount) }}</span></div>
        <div class="trow strong"><span>Neto a pagar</span><span>{{ formatMoney(d.netPayableAmount) }}</span></div>
      </template>
      <div v-if="d.payments.length" class="pays">
        <span v-for="p in d.payments" :key="p.id" class="pay">{{ PAYMENT_MEANS_LABEL[p.paymentMeans] }}: {{ formatMoney(p.amount) }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; gap: 16px; }
.back {
  display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-family: inherit;
  font-size: 13px; color: var(--amatista-700); background: transparent; border: none; cursor: pointer; padding: 4px 0;
}
.back:hover { text-decoration: underline; }
.head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.num { font-family: var(--font-serif); font-size: 26px; color: var(--warm-900); letter-spacing: -0.01em; }
.type { font-size: 13px; color: var(--warm-500); }
.reversed-banner {
  padding: 10px 14px; border-radius: 9px; font-size: 12.5px;
  background: oklch(94% 0.06 25); color: oklch(45% 0.18 25); border: 1px solid oklch(88% 0.08 25);
}
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
.act {
  display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13px; cursor: pointer;
  padding: 8px 14px; border-radius: 9px; background: white; border: 1px solid var(--warm-200); color: var(--warm-800);
}
.act:hover { border-color: var(--amatista-300); background: var(--amatista-50); color: var(--amatista-700); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
.card { background: white; border: 1px solid var(--warm-200); border-radius: 14px; padding: 18px 20px; }
.card h3 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 600; }
.card h3.mt { margin-top: 18px; }
dl { display: flex; flex-direction: column; gap: 8px; margin: 0; }
dl div { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; }
dt { color: var(--warm-500); }
dd { margin: 0; color: var(--warm-900); text-align: right; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.copy { background: transparent; border: none; cursor: pointer; color: var(--amatista-600); vertical-align: middle; }
.qr { margin-top: 14px; display: flex; justify-content: center; }
.qr img { width: 130px; height: 130px; object-fit: contain; }
.lines { width: 100%; border-collapse: collapse; font-size: 13px; }
.lines th, .lines td { padding: 8px 10px; border-bottom: 1px solid var(--warm-100); text-align: left; }
.lines th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; }
.lines .r { text-align: right; font-variant-numeric: tabular-nums; }
.totals { max-width: 420px; margin-left: auto; display: flex; flex-direction: column; gap: 6px; }
.trow { display: flex; justify-content: space-between; font-size: 13px; color: var(--warm-700); }
.trow span:last-child { font-variant-numeric: tabular-nums; color: var(--warm-900); }
.trow.sub { color: var(--warm-500); font-size: 12.5px; }
.trow.strong { font-weight: 700; border-top: 1.5px solid var(--warm-200); padding-top: 6px; margin-top: 2px; }
.pays { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.pay { font-size: 11.5px; color: var(--warm-600); background: var(--warm-100); padding: 3px 9px; border-radius: 999px; }
</style>

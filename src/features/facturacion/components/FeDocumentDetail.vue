<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Check, History, FileText, FilePlus, ScanLine, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import { feMoney } from '../composables/feFormat'
import FeStatusPill from './FeStatusPill.vue'
import FeNoteModal from './FeNoteModal.vue'
import {
  COMPANY_DOCTYPE_LABEL,
  DOC_TYPE_LABEL,
  PAYMENT_MEANS_LABEL,
  type CompanyDocumentType,
  type CreditNoteReason,
  type CustomerSnapshot,
  type DebitNoteReason,
  type DianStatus,
  type ElectronicDocumentResponse,
  type IssuerSnapshot,
} from '../types/facturacion'

const props = defineProps<{ doc: ElectronicDocumentResponse }>()
const emit = defineEmits<{ back: [] }>()

const { canTransmit, canEmit } = useFacturacionAccess()
const { refresh, transmit, convertToInvoice, creditNote, debitNote } = useFacturacionDocs()
const toast = useToast()

const noteModal = ref<'credit' | 'debit' | null>(null)
const busy = ref(false)

const isInvoice = computed(() => props.doc.documentType === 'FE_VENTA')
const validated = computed(() => props.doc.dianStatus === 'VALIDADO')
const hasReten = computed(
  () =>
    props.doc.reteFuenteAmount > 0 || props.doc.reteIvaAmount > 0 || props.doc.reteIcaAmount > 0,
)
const idLabel = computed(() => (props.doc.cufe ? 'CUFE' : 'CUDE'))
const idValue = computed(() => props.doc.cufe || props.doc.cude || '')

const TIMELINE: Record<DianStatus, string[]> = {
  PENDIENTE: ['Emitido', 'Validando DIAN'],
  VALIDADO: ['Emitido', 'Validado DIAN', 'Disponible'],
  RECHAZADO: ['Emitido', 'Rechazado DIAN'],
  CONTINGENCIA: ['Emitido', 'En contingencia'],
  NO_ELECTRONICO: ['Guardado local'],
}
const steps = computed(() => TIMELINE[props.doc.dianStatus] ?? [])

function docTypeLabel(dt: string): string {
  return COMPANY_DOCTYPE_LABEL[dt as CompanyDocumentType]?.split(' ')[0] ?? dt
}

const issuerParty = computed(() => partyFromIssuer(props.doc.issuer))
const customerParty = computed(() => partyFromCustomer(props.doc.customer))

function partyFromIssuer(p: IssuerSnapshot) {
  return {
    name: p.legalName ?? '—',
    docType: docTypeLabel(p.documentType),
    docId: p.documentId,
    dv: p.verificationDigit,
    regime: p.taxRegime,
    personType: null as string | null,
    email: p.email,
  }
}
function partyFromCustomer(p: CustomerSnapshot) {
  return {
    name: p.legalName || p.name || '—',
    docType: docTypeLabel(p.documentType),
    docId: p.documentId,
    dv: p.verificationDigit,
    regime: null as string | null,
    personType: p.personType,
    email: p.email,
  }
}

async function doRefresh() {
  busy.value = true
  try {
    await refresh(props.doc.id)
  } catch {
    toast.error('No se pudo refrescar', 'Intenta de nuevo en unos segundos.')
  } finally {
    busy.value = false
  }
}
async function doTransmit() {
  busy.value = true
  try {
    await transmit(props.doc.id)
    toast.info('Re-transmitiendo', 'Reintentando ante el proveedor…')
  } catch {
    toast.error('No se pudo re-transmitir', 'Intenta de nuevo más tarde.')
  } finally {
    busy.value = false
  }
}
async function doConvert() {
  busy.value = true
  try {
    await convertToInvoice(props.doc.id)
    toast.success('Convertido a factura', 'Se generó una FE sobre la misma venta.')
  } catch {
    toast.error('No se pudo convertir', 'Intenta de nuevo más tarde.')
  } finally {
    busy.value = false
  }
}
async function issueNote(reason: string) {
  const kind = noteModal.value
  try {
    if (kind === 'credit') await creditNote(props.doc.id, reason as CreditNoteReason)
    else if (kind === 'debit') await debitNote(props.doc.id, reason as DebitNoteReason)
    toast.success(
      kind === 'credit' ? 'Nota crédito emitida' : 'Nota débito emitida',
      'Sigue su propio ciclo de validación.',
    )
    noteModal.value = null
  } catch {
    toast.error('No se pudo emitir la nota', 'Verifica el estado del documento.')
  }
}

function copyId() {
  if (idValue.value && navigator.clipboard)
    navigator.clipboard.writeText(idValue.value).catch(() => undefined)
  toast.success('Copiado', idLabel.value)
}
</script>

<template>
  <div class="detail">
    <button type="button" class="back" @click="emit('back')">
      <ArrowLeft :size="15" :stroke-width="1.7" /> Volver a documentos
    </button>

    <div class="head">
      <div>
        <div class="num">{{ doc.prefix }}-{{ doc.consecutive }}</div>
        <h1 class="type">{{ DOC_TYPE_LABEL[doc.documentType] }}</h1>
        <div class="meta">Emitido {{ doc.issueDate }} {{ doc.issueTime?.slice(0, 5) }}</div>
      </div>
      <div class="head-right">
        <FeStatusPill :status="doc.dianStatus" size="lg" />
        <span v-if="doc.reversed" class="reversed">Anulada por nota crédito</span>
      </div>
    </div>

    <div class="statusbar">
      <div class="timeline">
        <template v-for="(s, i) in steps" :key="i">
          <div
            class="tlstep"
            :class="{
              done: i < steps.length - 1 || validated,
              err: doc.dianStatus === 'RECHAZADO' && i === steps.length - 1,
            }"
          >
            <span class="tldot">
              <Check v-if="i < steps.length - 1 || validated" :size="11" :stroke-width="2.6" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="tllbl">{{ s }}</span>
          </div>
          <span v-if="i < steps.length - 1" class="tlbar" />
        </template>
      </div>
      <div class="statusactions">
        <button
          v-if="doc.dianStatus === 'PENDIENTE'"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="doRefresh"
        >
          <History :size="14" :stroke-width="1.8" /> Refrescar estado
        </button>
        <button
          v-if="doc.dianStatus === 'CONTINGENCIA' && canTransmit"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="doTransmit"
        >
          <History :size="14" :stroke-width="1.8" /> Re-transmitir
        </button>
        <button
          v-if="validated && doc.documentType === 'DOC_EQUIV_POS' && canEmit"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--snug"
          :disabled="busy"
          @click="doConvert"
        >
          Convertir a factura
        </button>
      </div>
    </div>

    <div v-if="doc.dianStatus === 'RECHAZADO'" class="rejectbox">
      <X :size="15" :stroke-width="2" />
      <div>
        <strong>Documento rechazado por la DIAN.</strong>
        <div>
          Revisa el detalle del rechazo en la bitácora de transmisión y corrige con una nota
          crédito.
        </div>
      </div>
    </div>
    <div v-if="doc.dianStatus === 'NO_ELECTRONICO'" class="noelecbox">
      <FileText :size="15" :stroke-width="1.8" />
      Este registro no se envió a la DIAN porque el plan no incluye facturación electrónica.
    </div>

    <div class="grid">
      <div class="ds-card">
        <div class="card-title">Emisor</div>
        <div class="party">
          <div class="party-name">{{ issuerParty.name }}</div>
          <div class="party-rows">
            <div>
              <span>Documento</span
              ><span
                >{{ issuerParty.docType }} {{ issuerParty.docId
                }}<template v-if="issuerParty.dv">-{{ issuerParty.dv }}</template></span
              >
            </div>
            <div v-if="issuerParty.regime">
              <span>Régimen</span><span>{{ issuerParty.regime }}</span>
            </div>
            <div>
              <span>Correo</span><span>{{ issuerParty.email || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="ds-card">
        <div class="card-title">Adquiriente</div>
        <div class="party">
          <div class="party-name">{{ customerParty.name }}</div>
          <div class="party-rows">
            <div>
              <span>Documento</span
              ><span
                >{{ customerParty.docType }} {{ customerParty.docId
                }}<template v-if="customerParty.dv">-{{ customerParty.dv }}</template></span
              >
            </div>
            <div v-if="customerParty.personType">
              <span>Tipo</span
              ><span>{{ customerParty.personType === 'JURIDICA' ? 'Jurídica' : 'Natural' }}</span>
            </div>
            <div>
              <span>Correo</span><span>{{ customerParty.email || '—' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="validated && idValue" class="ds-card cufebox">
      <div class="qr">
        <img v-if="doc.qrUrl" :src="doc.qrUrl" alt="Código QR DIAN" class="qr-img" />
        <ScanLine v-else :size="48" :stroke-width="1.2" />
      </div>
      <div class="cufe-text">
        <div class="card-title">{{ idLabel }}</div>
        <div class="cufeval">{{ idValue }}</div>
        <button type="button" class="copybtn" @click="copyId">
          <FileText :size="12" :stroke-width="1.8" /> Copiar {{ idLabel }}
        </button>
        <div class="meta" style="margin-top: 6px">
          <template v-if="doc.dianValidationDate"
            >Validado {{ doc.dianValidationDate.replace('T', ' ').slice(0, 16) }} · </template
          >UUID {{ doc.uuid }}
        </div>
      </div>
    </div>

    <div v-if="doc.lines.length" class="ds-card">
      <div class="card-title">Detalle</div>
      <div class="tbl-scroll">
        <table class="lines">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th style="text-align: right">V. unit.</th>
              <th>Imp.</th>
              <th style="text-align: right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in doc.lines" :key="l.lineNumber">
              <td>{{ l.description }}</td>
              <td>{{ l.quantity }}</td>
              <td style="text-align: right">{{ feMoney(l.unitPrice) }}</td>
              <td>
                <span v-if="l.taxScheme" class="taxchip">{{ l.taxScheme }} {{ l.taxRate }}%</span>
                <span v-else class="taxchip muted">{{ l.taxCategory }}</span>
              </td>
              <td style="text-align: right; font-weight: 600">{{ feMoney(l.totalAmount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ds-card totals">
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
      <div class="tot-pay">
        {{ doc.paymentForm === 'CONTADO' ? 'Contado' : 'Crédito' }}
        <template v-for="p in doc.payments" :key="p.id">
          · {{ PAYMENT_MEANS_LABEL[p.paymentMeans] }}</template
        >
      </div>
    </div>

    <div v-if="isInvoice && validated && !doc.reversed && canEmit" class="noteactions">
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="noteModal = 'credit'">
        <FileText :size="14" :stroke-width="1.8" /> Emitir nota crédito
      </button>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="noteModal = 'debit'">
        <FilePlus :size="14" :stroke-width="1.8" /> Emitir nota débito
      </button>
    </div>

    <FeNoteModal
      :open="!!noteModal"
      :kind="noteModal"
      @issue="issueNote"
      @close="noteModal = null"
    />
  </div>
</template>

<style scoped>
.detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.back {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--warm-600);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
}

.back:hover {
  background: var(--amatista-50);
  color: var(--amatista-700);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.num {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--amatista-700);
  font-weight: 600;
}

.type {
  margin: 4px 0 0;
  font-family: var(--font-serif);
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.05;
}

.meta {
  font-size: 12.5px;
  color: var(--warm-500);
  margin-top: 6px;
}

.head-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.reversed {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--danger-600);
  background: var(--danger-50);
  padding: 3px 9px;
  border-radius: var(--radius-pill);
}

.statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 16px 18px;
  border-radius: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
}

.timeline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tlstep {
  display: flex;
  align-items: center;
  gap: 7px;
}

.tldot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--warm-200);
  color: var(--warm-600);
  font-size: 11px;
  font-weight: 600;
}

.tlstep.done .tldot {
  background: oklch(55% 0.15 150deg);
  color: #fff;
}

.tlstep.err .tldot {
  background: oklch(58% 0.2 25deg);
  color: #fff;
}

.tllbl {
  font-size: 12px;
  color: var(--warm-700);
}

.tlbar {
  width: 28px;
  height: 2px;
  background: var(--warm-200);
  border-radius: 2px;
}

.statusactions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.rejectbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--danger-50);
  border: 1px solid var(--danger-250);
  color: oklch(45% 0.16 25deg);
  font-size: 13px;
  line-height: 1.45;
}

.noelecbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--warm-100);
  color: var(--warm-600);
  font-size: 12.5px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.card-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
}

.party-name {
  font-weight: 600;
  font-size: 14.5px;
  color: var(--warm-900);
  margin-bottom: 8px;
}

.party-rows {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.party-rows > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12.5px;
}

.party-rows span:first-child {
  color: var(--warm-500);
}

.party-rows span:last-child {
  color: var(--warm-800);
  text-align: right;
  overflow-wrap: anywhere;
}

.cufebox {
  display: flex;
  align-items: center;
  gap: 18px;
}

.qr {
  width: 110px;
  height: 110px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: var(--warm-100);
  color: var(--warm-700);
  flex-shrink: 0;
  overflow: hidden;
}

.qr-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
  padding: 6px;
  border-radius: 12px;
}

.cufe-text {
  flex: 1;
  min-width: 0;
}

.cufeval {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--warm-800);
  word-break: break-all;
  margin-bottom: 8px;
}

.copybtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  font-size: 11.5px;
  color: var(--warm-700);
  cursor: pointer;
}

.lines {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.lines th {
  text-align: left;
  font-weight: 500;
  color: var(--warm-500);
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}

.lines td {
  padding: 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}

.taxchip {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-weight: 600;
}

.taxchip.muted {
  background: var(--warm-150, var(--warm-100));
  color: var(--warm-600);
}

.totals {
  display: flex;
  flex-direction: column;
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
  font-size: 12px;
  color: var(--warm-500);
}

.noteactions {
  display: flex;
  gap: 10px;
}

/* Override mínimo sobre `.ds-card`. */
.ds-card {
  padding: 18px 20px;
}
</style>

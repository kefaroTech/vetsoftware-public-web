<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Check, History, FileText, FilePlus, ScanLine, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import FeStatusPill from './FeStatusPill.vue'
import FeNoteModal from './FeNoteModal.vue'
import FeDocumentParties from './FeDocumentParties.vue'
import FeDocumentTotals from './FeDocumentTotals.vue'
import FeDocumentLines from './FeDocumentLines.vue'
import {
  DOC_TYPE_LABEL,
  type CreditNoteReason,
  type DebitNoteReason,
  type DianStatus,
  type ElectronicDocumentResponse,
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
  <div class="ds-stack ds-stack--18">
    <button type="button" class="back ds-hover-accent" @click="emit('back')">
      <ArrowLeft :size="15" :stroke-width="1.7" /> Volver a documentos
    </button>

    <div class="head">
      <div>
        <div class="num">{{ doc.prefix }}-{{ doc.consecutive }}</div>
        <h1 class="type">{{ DOC_TYPE_LABEL[doc.documentType] }}</h1>
        <div class="meta ds-meta ds-meta--sm">
          Emitido {{ doc.issueDate }} {{ doc.issueTime?.slice(0, 5) }}
        </div>
      </div>
      <div class="head-right ds-stack ds-stack--8">
        <FeStatusPill :status="doc.dianStatus" size="lg" />
        <span v-if="doc.reversed" class="reversed">Anulada por nota crédito</span>
      </div>
    </div>

    <div class="statusbar">
      <div class="ds-flex-row ds-flex-row--6">
        <template v-for="(s, i) in steps" :key="i">
          <div
            class="tlstep"
            :class="{
              done: i < steps.length - 1 || validated,
              err: doc.dianStatus === 'RECHAZADO' && i === steps.length - 1,
            }"
          >
            <span class="tldot ds-tone--neutral">
              <Check v-if="i < steps.length - 1 || validated" :size="11" :stroke-width="2.6" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="tllbl">{{ s }}</span>
          </div>
          <span v-if="i < steps.length - 1" class="tlbar" />
        </template>
      </div>
      <div class="ds-wrap-row">
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
    <div v-if="doc.dianStatus === 'NO_ELECTRONICO'" class="noelecbox ds-flex-row">
      <FileText :size="15" :stroke-width="1.8" />
      Este registro no se envió a la DIAN porque el plan no incluye facturación electrónica.
    </div>

    <FeDocumentParties :issuer="doc.issuer" :customer="doc.customer" />

    <div v-if="validated && idValue" class="ds-card cufebox">
      <div class="qr">
        <img v-if="doc.qrUrl" :src="doc.qrUrl" alt="Código QR DIAN" class="qr-img" />
        <ScanLine v-else :size="48" :stroke-width="1.2" />
      </div>
      <div class="ds-flex-fill">
        <div class="card-title">{{ idLabel }}</div>
        <div class="cufeval">{{ idValue }}</div>
        <button type="button" class="copybtn" @click="copyId">
          <FileText :size="12" :stroke-width="1.8" /> Copiar {{ idLabel }}
        </button>
        <div class="meta ds-meta ds-meta--sm">
          <template v-if="doc.dianValidationDate"
            >Validado {{ doc.dianValidationDate.replace('T', ' ').slice(0, 16) }} · </template
          >UUID {{ doc.uuid }}
        </div>
      </div>
    </div>

    <div v-if="doc.lines.length" class="ds-card">
      <div class="card-title">Detalle</div>
      <FeDocumentLines :lines="doc.lines" />
    </div>

    <FeDocumentTotals :doc="doc" />

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
/* Layout via primitivas: .ds-stack(--8/--18), .ds-flex-row(--6), .ds-wrap-row,
   .ds-flex-fill, .ds-meta(--sm) y .ds-tone--neutral. Aquí sólo lo propio del
   documento. */
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

/* El hover del "volver" es `.ds-hover-accent` (primitives.css) — la variante de
   BOTÓN DE TEXTO del trío de acento, la que documenta `ExportBar.vue`. No es
   `.ds-tone--accent-soft`, que no tiene forma `:hover` y en reposo perdería
   contra `.back[data-v-…]`: aquí gana con (0,3,0) sobre (0,2,0). Su tercera
   declaración (`border-color: amatista-300`) es inerte en este botón, que
   declara `border: none` — el ancho usado es 0 y el color no se ve. */

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
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.05;
}

.meta {
  margin-top: 6px;
}

.head-right {
  align-items: flex-end;
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
  font-size: 11px;
  font-weight: 600;
}

.tlstep.done .tldot {
  background: var(--success-dot);
  color: var(--warm-50);
}

.tlstep.err .tldot {
  background: var(--danger-500);
  color: var(--warm-50);
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

.rejectbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--danger-50);
  border: 1px solid var(--danger-border);
  color: var(--danger-800);
  font-size: 13px;
  line-height: 1.45;
}

.noelecbox {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--warm-100);
  color: var(--warm-600);
  font-size: 12.5px;
}

.card-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
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
  background: var(--warm-50);
  padding: 6px;
  border-radius: 12px;
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
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  font-size: 11.5px;
  color: var(--warm-700);
  cursor: pointer;
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

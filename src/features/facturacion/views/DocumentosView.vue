<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { History, Plus } from 'lucide-vue-next'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import FeStatusPill from '../components/FeStatusPill.vue'
import EmitDocumentModal from '../components/EmitDocumentModal.vue'
import NoteModal from '../components/NoteModal.vue'
import DocumentoDetail from '../components/DocumentoDetail.vue'
import {
  DOC_TYPE_LABEL,
  STATUS_META,
  type DianStatus,
  type ElectronicDocumentType,
} from '../types/facturacion'

const docs = useFacturacionDocs()
const { canEmit } = useFacturacionAccess()
const toast = useToast()

const selectedId = ref<number | null>(null)
const emitOpen = ref(false)
const note = ref<{ open: boolean; kind: 'credit' | 'debit'; documentId: number | null }>({
  open: false,
  kind: 'credit',
  documentId: null,
})

const fType = ref<ElectronicDocumentType | ''>('')
const fStatus = ref<DianStatus | ''>('')

const selected = computed(
  () => docs.documents.value.find((d) => d.id === selectedId.value) ?? null,
)

const filtered = computed(() =>
  docs.documents.value.filter(
    (d) => (!fType.value || d.documentType === fType.value) && (!fStatus.value || d.dianStatus === fStatus.value),
  ),
)

const typeOptions = Object.entries(DOC_TYPE_LABEL) as [ElectronicDocumentType, string][]
const statusOptions = Object.entries(STATUS_META).map(([k, v]) => [k, v.label]) as [DianStatus, string][]

onMounted(() => docs.ensureLoaded())

async function onTransmit(id: number) {
  try {
    await docs.transmit(id)
    toast.success('Re-transmitido', 'Enviado a la DIAN · validando…')
  } catch (e) {
    toast.error('No se pudo transmitir', getProblemDetailMessage(e))
  }
}

async function onConvert(id: number) {
  try {
    const invoice = await docs.convertToInvoice(id)
    toast.success('Convertido a factura', 'Se emitió la factura electrónica.')
    selectedId.value = invoice.id
  } catch (e) {
    toast.error('No se pudo convertir', getProblemDetailMessage(e))
  }
}

function openNote(kind: 'credit' | 'debit', id: number) {
  note.value = { open: true, kind, documentId: id }
}

function shortKey(cufe: string | null, cude: string | null): string {
  const k = cufe || cude
  return k ? `${k.slice(0, 16)}…` : '—'
}
</script>

<template>
  <div class="page">
    <!-- Detalle inline -->
    <DocumentoDetail
      v-if="selected"
      :doc="selected"
      @back="selectedId = null"
      @transmit="onTransmit"
      @convert="onConvert"
      @credit-note="(id) => openNote('credit', id)"
      @debit-note="(id) => openNote('debit', id)"
    />

    <!-- Listado -->
    <template v-else>
      <header class="head">
        <div>
          <div class="kicker">Facturación electrónica</div>
          <h1 class="title">Documentos</h1>
        </div>
        <button v-if="canEmit" type="button" class="cta" @click="emitOpen = true">
          <Plus :size="16" :stroke-width="1.9" /> Emisión manual
        </button>
      </header>

      <div class="autobanner">
        <History :size="14" :stroke-width="1.8" />
        <span>La emisión es <strong>automática</strong> al cerrar/cobrar una venta. Usa <strong>Emisión manual</strong> solo para re-emitir o casos especiales.</span>
      </div>

      <div class="filters">
        <select v-model="fType" class="filter">
          <option value="">Todos los tipos</option>
          <option v-for="[k, label] in typeOptions" :key="k" :value="k">{{ label }}</option>
        </select>
        <select v-model="fStatus" class="filter">
          <option value="">Todos los estados</option>
          <option v-for="[k, label] in statusOptions" :key="k" :value="k">{{ label }}</option>
        </select>
      </div>

      <p v-if="docs.error.value" class="error">{{ docs.error.value }}</p>

      <table class="table">
        <thead>
          <tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th class="r">Total</th><th>Estado</th><th>CUFE/CUDE</th></tr>
        </thead>
        <tbody>
          <tr v-for="d in filtered" :key="d.id" class="row" @click="selectedId = d.id">
            <td><span class="num">{{ d.prefix ?? '—' }}-{{ d.consecutive ?? '—' }}</span></td>
            <td>{{ DOC_TYPE_LABEL[d.documentType] }}</td>
            <td class="muted">{{ d.issueDate }}</td>
            <td>
              {{ d.customer.legalName || d.customer.name || '—' }}
              <span v-if="d.reversed" class="reversed">Anulada</span>
            </td>
            <td class="r">{{ formatMoney(d.payableAmount) }}</td>
            <td><FeStatusPill :status="d.dianStatus" /></td>
            <td><span class="cufe">{{ shortKey(d.cufe, d.cude) }}</span></td>
          </tr>
          <tr v-if="!docs.loading.value && filtered.length === 0">
            <td colspan="7" class="empty">Sin documentos para los filtros aplicados.</td>
          </tr>
        </tbody>
      </table>
    </template>

    <EmitDocumentModal :open="emitOpen" @close="emitOpen = false" @emitted="(id) => { emitOpen = false; selectedId = id }" />
    <NoteModal
      :open="note.open"
      :kind="note.kind"
      :document-id="note.documentId"
      @close="note.open = false"
      @done="(id) => { note.open = false; selectedId = id }"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; }
.title { margin: 4px 0 0; font-family: var(--font-serif); font-size: 34px; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); line-height: 1.05; }
.cta {
  display: inline-flex; align-items: center; gap: 7px; font-family: inherit; font-size: 13.5px; font-weight: 500;
  padding: 10px 16px; border-radius: 10px; cursor: pointer; border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.autobanner {
  display: flex; align-items: center; gap: 9px; padding: 11px 14px; border-radius: 11px;
  background: var(--amatista-50); border: 1px solid var(--amatista-100); color: var(--amatista-800); font-size: 12.5px;
}
.filters { display: flex; gap: 12px; flex-wrap: wrap; }
.filter {
  font-family: inherit; font-size: 13px; padding: 8px 12px; border-radius: 9px;
  border: 1px solid var(--warm-200); background: white; color: var(--warm-800);
}
.error { margin: 0; color: oklch(48% 0.18 25); font-size: 13px; }
.table { width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--warm-200); border-radius: 14px; overflow: hidden; }
.table th, .table td { padding: 12px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--warm-100); }
.table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; background: var(--warm-50); }
.table .r { text-align: right; font-variant-numeric: tabular-nums; }
.row { cursor: pointer; transition: background 0.12s ease; }
.row:hover { background: var(--amatista-50); }
.num { font-family: var(--font-mono); font-size: 12.5px; color: var(--warm-900); }
.muted { color: var(--warm-500); }
.cufe { font-family: var(--font-mono); font-size: 11.5px; color: var(--warm-500); }
.reversed { margin-left: 8px; font-size: 10.5px; color: oklch(48% 0.18 25); background: oklch(94% 0.06 25); padding: 1px 7px; border-radius: 999px; }
.empty { text-align: center; color: var(--warm-500); padding: 28px; }
</style>

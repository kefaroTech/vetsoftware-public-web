<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Plus, History, ChevronRight } from 'lucide-vue-next'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { useFacturacionDocs } from '../composables/useFacturacionDocs'
import { feMoney } from '../composables/feFormat'
import {
  DOC_TYPE_LABEL,
  STATUS_META,
  type DianStatus,
  type ElectronicDocumentType,
} from '../types/facturacion'
import FeStatusPill from '../components/FeStatusPill.vue'
import FeEmitModal from '../components/FeEmitModal.vue'
import FeDocumentDetail from '../components/FeDocumentDetail.vue'
import FeUpsell from '../components/FeUpsell.vue'

const { hasModule, canEmit } = useFacturacionAccess()
const { documents, loading, error, ensureLoaded } = useFacturacionDocs()

const filterType = ref<ElectronicDocumentType | ''>('')
const filterStatus = ref<DianStatus | ''>('')
const selectedId = ref<number | null>(null)
const emitOpen = ref(false)

onMounted(() => {
  void ensureLoaded()
})

const typeOptions = (Object.keys(DOC_TYPE_LABEL) as ElectronicDocumentType[]).map((k) => ({
  value: k,
  label: DOC_TYPE_LABEL[k],
}))
const statusOptions = (Object.keys(STATUS_META) as DianStatus[]).map((k) => ({
  value: k,
  label: STATUS_META[k].label,
}))

const filtered = computed(() =>
  documents.value.filter(
    (d) =>
      (!filterType.value || d.documentType === filterType.value) &&
      (!filterStatus.value || d.dianStatus === filterStatus.value),
  ),
)

const selectedDoc = computed(() =>
  selectedId.value != null ? (documents.value.find((d) => d.id === selectedId.value) ?? null) : null,
)

function shortId(cufe: string | null, cude: string | null): string {
  const v = cufe || cude
  return v ? v.slice(0, 16) + '…' : '—'
}
</script>

<template>
  <FeUpsell v-if="!hasModule" />
  <FeDocumentDetail v-else-if="selectedDoc" :doc="selectedDoc" @back="selectedId = null" />
  <div v-else class="page">
    <header class="pagehead">
      <div>
        <div class="kicker">Facturación electrónica · DIAN</div>
        <h1 class="title">Documentos electrónicos</h1>
      </div>
    </header>

    <div class="listhead">
      <div class="filters">
        <select v-model="filterType" class="filter-select">
          <option value="">Todos los tipos</option>
          <option v-for="o in typeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <select v-model="filterStatus" class="filter-select">
          <option value="">Todos los estados</option>
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>
      <button v-if="canEmit" type="button" class="ghost" @click="emitOpen = true">
        <Plus :size="16" :stroke-width="2" /> Emisión manual
      </button>
    </div>

    <div class="autobanner">
      <History :size="14" :stroke-width="1.8" />
      <span>
        La emisión es <strong>automática</strong> al cerrar/cobrar una venta. Usa
        <strong>Emisión manual</strong> solo para re-emitir o casos especiales.
      </span>
    </div>

    <p v-if="error" class="error-banner">{{ error }}</p>

    <table class="table">
      <thead>
        <tr>
          <th>Número</th>
          <th>Tipo</th>
          <th>Fecha</th>
          <th>Cliente</th>
          <th style="text-align: right">Total</th>
          <th>Estado</th>
          <th>CUFE/CUDE</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="d in filtered" :key="d.id" class="row" @click="selectedId = d.id">
          <td><span class="num">{{ d.prefix }}-{{ d.consecutive }}</span></td>
          <td>{{ DOC_TYPE_LABEL[d.documentType] }}</td>
          <td class="date">{{ d.issueDate }}</td>
          <td class="cust">
            {{ d.customer.legalName || d.customer.name }}
            <span v-if="d.reversed" class="reversed">Anulada</span>
          </td>
          <td style="text-align: right; font-variant-numeric: tabular-nums">
            {{ feMoney(d.payableAmount) }}
          </td>
          <td><FeStatusPill :status="d.dianStatus" /></td>
          <td><span class="cufe">{{ shortId(d.cufe, d.cude) }}</span></td>
          <td><ChevronRight :size="15" :stroke-width="1.6" class="chev" /></td>
        </tr>
        <tr v-if="!loading && filtered.length === 0">
          <td colspan="8" class="empty">Sin documentos para los filtros aplicados.</td>
        </tr>
      </tbody>
    </table>

    <FeEmitModal
      :open="emitOpen"
      @emitted="
        (doc) => {
          emitOpen = false
          selectedId = doc.id
        }
      "
      @close="emitOpen = false"
    />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.pagehead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}
.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
}
.title {
  margin: 6px 0 0;
  font-family: var(--font-serif);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--warm-900);
  line-height: 1.05;
}
.listhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.filters {
  display: flex;
  gap: 10px;
}
.filter-select {
  appearance: none;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 8px 30px 8px 12px;
  font-size: 13px;
  color: var(--warm-800);
  font-family: inherit;
  cursor: pointer;
}
.ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 9px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-700);
  cursor: pointer;
}
.ghost:hover {
  background: var(--warm-100);
}
.autobanner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-100);
  font-size: 12.5px;
  color: var(--warm-700);
}
.error-banner {
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  background: oklch(95% 0.05 25);
  border: 1px solid oklch(85% 0.08 25);
  color: oklch(45% 0.16 25);
  font-size: 13px;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.table th {
  text-align: left;
  font-weight: 500;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  padding: 8px 12px;
  border-bottom: 1px solid var(--warm-200);
}
.row {
  cursor: pointer;
  transition: background 0.12s ease;
}
.row:hover {
  background: var(--amatista-50);
}
.table td {
  padding: 12px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}
.num {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--amatista-700);
  font-weight: 600;
}
.date {
  color: var(--warm-500);
  font-variant-numeric: tabular-nums;
}
.cust {
  display: flex;
  align-items: center;
  gap: 8px;
}
.reversed {
  font-size: 10.5px;
  font-weight: 600;
  color: oklch(50% 0.18 25);
  background: oklch(95% 0.05 25);
  padding: 1px 7px;
  border-radius: 999px;
}
.cufe {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--warm-500);
}
.chev {
  color: var(--warm-400);
}
.empty {
  text-align: center;
  color: var(--warm-500);
  padding: 28px 12px;
}
</style>

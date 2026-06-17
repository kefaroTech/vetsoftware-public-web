<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { salesReportApi } from '../api/salesReport.api'
import FeStatusPill from '../components/FeStatusPill.vue'
import { DOC_TYPE_LABEL, type ReconciliationResponse, type SalesBookResponse, type ElectronicDocumentType } from '../types/facturacion'

const toast = useToast()

type Tab = 'libro' | 'conciliacion'
const tab = ref<Tab>('libro')

function monthStart(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const from = ref(monthStart())
const to = ref(todayIso())
const loading = ref(false)
const book = ref<SalesBookResponse | null>(null)
const recon = ref<ReconciliationResponse | null>(null)

function docTypeLabel(t: string): string {
  return DOC_TYPE_LABEL[t as ElectronicDocumentType] ?? t
}

async function run() {
  loading.value = true
  try {
    if (tab.value === 'libro') {
      book.value = await salesReportApi.salesBook(from.value, to.value)
    } else {
      recon.value = await salesReportApi.reconciliation(from.value, to.value)
    }
  } catch (e) {
    toast.error('No se pudo generar el reporte', getProblemDetailMessage(e))
  } finally {
    loading.value = false
  }
}

function setTab(t: Tab) {
  tab.value = t
  run()
}

onMounted(run)
</script>

<template>
  <div class="page">
    <header class="head">
      <div class="kicker">Facturación electrónica</div>
      <h1 class="title">Reportes</h1>
    </header>

    <div class="tabs">
      <button type="button" :class="{ on: tab === 'libro' }" @click="setTab('libro')">Libro de ventas</button>
      <button type="button" :class="{ on: tab === 'conciliacion' }" @click="setTab('conciliacion')">Conciliación DIAN</button>
    </div>

    <div class="range">
      <label>Desde <input v-model="from" type="date" /></label>
      <label>Hasta <input v-model="to" type="date" /></label>
      <button type="button" class="btn-primary" :disabled="loading" @click="run">{{ loading ? 'Generando…' : 'Generar' }}</button>
    </div>

    <!-- LIBRO DE VENTAS -->
    <template v-if="tab === 'libro' && book">
      <div class="summary">
        <div class="kpi"><span>Documentos</span><strong>{{ book.totals.documentCount }}</strong></div>
        <div class="kpi"><span>Base</span><strong>{{ formatMoney(book.totals.base) }}</strong></div>
        <div class="kpi"><span>IVA</span><strong>{{ formatMoney(book.totals.iva) }}</strong></div>
        <div class="kpi"><span>Total</span><strong>{{ formatMoney(book.totals.total) }}</strong></div>
      </div>
      <table class="table">
        <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th><th class="r">Base</th><th class="r">IVA</th><th class="r">Total</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="e in book.entries" :key="e.id">
            <td class="mono">{{ e.prefix ?? '—' }}-{{ e.consecutive ?? '—' }}</td>
            <td>{{ docTypeLabel(e.documentType) }}</td>
            <td class="muted">{{ e.issueDate }}</td>
            <td>{{ e.customerName ?? '—' }}</td>
            <td class="r">{{ formatMoney(e.base) }}</td>
            <td class="r">{{ formatMoney(e.iva) }}</td>
            <td class="r">{{ formatMoney(e.total) }}</td>
            <td><FeStatusPill :status="e.dianStatus" /></td>
          </tr>
          <tr v-if="book.entries.length === 0"><td colspan="8" class="empty">Sin ventas en el rango.</td></tr>
        </tbody>
      </table>
      <div v-if="book.taxByRate.length" class="panels">
        <div class="panel">
          <h3>Impuestos por tarifa</h3>
          <div v-for="(t, i) in book.taxByRate" :key="i" class="prow">
            <span>{{ t.taxScheme }} {{ t.taxRate }}%</span><span>{{ formatMoney(t.taxAmount) }}</span>
          </div>
        </div>
        <div class="panel">
          <h3>Recaudo por medio</h3>
          <div v-for="(r, i) in book.recaudoByMeans" :key="i" class="prow">
            <span>{{ r.paymentMeans }}</span><span>{{ formatMoney(r.amount) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- CONCILIACIÓN -->
    <template v-if="tab === 'conciliacion' && recon">
      <div class="summary">
        <div class="kpi"><span>Total</span><strong>{{ recon.total }}</strong></div>
        <div class="kpi ok"><span>Validados</span><strong>{{ recon.validados }}</strong></div>
        <div class="kpi warn"><span>Contingencia</span><strong>{{ recon.contingencia }}</strong></div>
        <div class="kpi pend"><span>Pendientes</span><strong>{{ recon.pendientes }}</strong></div>
        <div class="kpi bad"><span>Rechazados</span><strong>{{ recon.rechazados }}</strong></div>
      </div>
      <h3 class="attn-title">Requieren atención</h3>
      <table class="table">
        <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="p in recon.needsAttention" :key="p.id">
            <td class="mono">{{ p.prefix ?? '—' }}-{{ p.consecutive ?? '—' }}</td>
            <td>{{ docTypeLabel(p.documentType) }}</td>
            <td class="muted">{{ p.issueDate }}</td>
            <td><FeStatusPill :status="p.dianStatus" /></td>
          </tr>
          <tr v-if="recon.needsAttention.length === 0"><td colspan="4" class="empty">Todo concilia. Sin documentos por atender.</td></tr>
        </tbody>
      </table>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; }
.title { margin: 4px 0 0; font-family: var(--font-serif); font-size: 34px; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); line-height: 1.05; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--warm-200); }
.tabs button {
  font-family: inherit; font-size: 13.5px; padding: 9px 14px; background: transparent; border: none; cursor: pointer;
  color: var(--warm-500); border-bottom: 2px solid transparent; margin-bottom: -1px;
}
.tabs button.on { color: var(--amatista-700); border-bottom-color: var(--amatista-600); font-weight: 600; }
.range { display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }
.range label { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--warm-600); }
.range input { font-family: inherit; font-size: 13px; padding: 8px 12px; border-radius: 9px; border: 1px solid var(--warm-200); background: white; }
.summary { display: flex; gap: 12px; flex-wrap: wrap; }
.kpi { flex: 1; min-width: 120px; background: white; border: 1px solid var(--warm-200); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.kpi span { font-size: 11.5px; color: var(--warm-500); text-transform: uppercase; letter-spacing: 0.04em; }
.kpi strong { font-family: var(--font-serif); font-size: 24px; color: var(--warm-900); font-weight: 400; }
.kpi.ok strong { color: oklch(45% 0.13 150); }
.kpi.warn strong { color: oklch(50% 0.13 70); }
.kpi.pend strong { color: oklch(45% 0.14 240); }
.kpi.bad strong { color: oklch(50% 0.18 25); }
.table { width: 100%; border-collapse: collapse; background: white; border: 1px solid var(--warm-200); border-radius: 14px; overflow: hidden; }
.table th, .table td { padding: 11px 14px; text-align: left; font-size: 13px; border-bottom: 1px solid var(--warm-100); }
.table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; background: var(--warm-50); }
.table .r { text-align: right; font-variant-numeric: tabular-nums; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.muted { color: var(--warm-500); }
.empty { text-align: center; color: var(--warm-500); padding: 24px; }
.panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .panels { grid-template-columns: 1fr; } }
.panel { background: white; border: 1px solid var(--warm-200); border-radius: 14px; padding: 16px 18px; }
.panel h3 { margin: 0 0 10px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--warm-500); font-weight: 600; }
.prow { display: flex; justify-content: space-between; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--warm-100); }
.prow span:last-child { font-variant-numeric: tabular-nums; color: var(--warm-900); }
.attn-title { margin: 4px 0 0; font-size: 13px; color: var(--warm-700); font-weight: 600; }
.btn-primary {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 9px 18px; border-radius: 9px; cursor: pointer;
  border: none; color: white; background: var(--amatista-700);
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>

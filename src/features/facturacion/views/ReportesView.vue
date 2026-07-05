<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { BarChart3, ShieldCheck } from 'lucide-vue-next'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useFacturacionAccess } from '../composables/useFacturacionAccess'
import { salesReportApi } from '../api/salesReport.api'
import { feMoney } from '../composables/feFormat'
import {
  DOC_TYPE_LABEL,
  PAYMENT_MEANS_LABEL,
  type ElectronicDocumentType,
  type PaymentMeans,
  type ReconciliationResponse,
  type SalesBookResponse,
} from '../types/facturacion'
import FeStatusPill from '../components/FeStatusPill.vue'
import FeUpsell from '../components/FeUpsell.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'

const { hasModule } = useFacturacionAccess()

type Tab = 'libro' | 'concil'
const tab = ref<Tab>('libro')

function firstOfMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function today(): string {
  return new Date().toISOString().slice(0, 10)
}

const from = ref(firstOfMonth())
const to = ref(today())

const book = ref<SalesBookResponse | null>(null)
const recon = ref<ReconciliationResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    if (tab.value === 'libro') book.value = await salesReportApi.salesBook(from.value, to.value)
    else recon.value = await salesReportApi.reconciliation(from.value, to.value)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el reporte')
  } finally {
    loading.value = false
  }
}

function setTab(t: Tab) {
  tab.value = t
  void load()
}

function docTypeLabel(dt: string): string {
  return DOC_TYPE_LABEL[dt as ElectronicDocumentType] ?? dt
}
function meansLabel(m: string): string {
  return PAYMENT_MEANS_LABEL[m as PaymentMeans] ?? m
}

onMounted(() => {
  if (hasModule) void load()
})
</script>

<template>
  <FeUpsell v-if="!hasModule" />
  <div v-else class="page">
    <header class="pagehead">
      <div>
        <div class="kicker">Facturación electrónica · DIAN</div>
        <h1 class="title">Reportes</h1>
      </div>
    </header>

    <div class="repfilters">
      <div class="tabs" role="tablist">
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: tab === 'libro' }"
          @click="setTab('libro')"
        >
          <BarChart3 :size="15" :stroke-width="1.7" /> Libro de ventas
        </button>
        <button
          type="button"
          role="tab"
          class="tab"
          :class="{ active: tab === 'concil' }"
          @click="setTab('concil')"
        >
          <ShieldCheck :size="15" :stroke-width="1.7" /> Conciliación DIAN
        </button>
      </div>
      <div class="daterange">
        <DateInput v-model="from" :max="to" @update:model-value="load" />
        <span class="sep">→</span>
        <DateInput v-model="to" :min="from" @update:model-value="load" />
      </div>
    </div>

    <p v-if="error" class="error-banner">{{ error }}</p>
    <div v-if="loading" class="loading">Cargando reporte…</div>

    <!-- Libro de ventas -->
    <template v-else-if="tab === 'libro' && book">
      <div class="cards">
        <div class="rep-card"><span>Documentos</span><strong>{{ book.totals.documentCount }}</strong></div>
        <div class="rep-card"><span>Base</span><strong>{{ feMoney(book.totals.base) }}</strong></div>
        <div class="rep-card"><span>IVA</span><strong>{{ feMoney(book.totals.iva) }}</strong></div>
        <div class="rep-card hl"><span>Total</span><strong>{{ feMoney(book.totals.total) }}</strong></div>
      </div>

      <div class="cols">
        <div class="card">
          <div class="card-title">Impuestos por tarifa</div>
          <div class="tbl-scroll">
          <table class="minitable">
            <thead>
              <tr><th>Esquema</th><th>Tarifa</th><th style="text-align: right">Base</th><th style="text-align: right">Impuesto</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in book.taxByRate" :key="i">
                <td>{{ r.taxScheme }}</td>
                <td>{{ r.taxRate }}%</td>
                <td style="text-align: right">{{ feMoney(r.taxableAmount) }}</td>
                <td style="text-align: right">{{ feMoney(r.taxAmount) }}</td>
              </tr>
              <tr v-if="book.taxByRate.length === 0"><td colspan="4" class="empty">Sin datos</td></tr>
            </tbody>
          </table>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Recaudo por medio de pago</div>
          <div class="tbl-scroll">
          <table class="minitable">
            <thead><tr><th>Medio</th><th style="text-align: right">Monto</th></tr></thead>
            <tbody>
              <tr v-for="(r, i) in book.recaudoByMeans" :key="i">
                <td>{{ meansLabel(r.paymentMeans) }}</td>
                <td style="text-align: right">{{ feMoney(r.amount) }}</td>
              </tr>
              <tr v-if="book.recaudoByMeans.length === 0"><td colspan="2" class="empty">Sin datos</td></tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Documentos del periodo</div>
        <div class="tbl-scroll">
        <table class="minitable">
          <thead>
            <tr>
              <th>Número</th><th>Tipo</th><th>Fecha</th><th>Cliente</th>
              <th style="text-align: right">Base</th><th style="text-align: right">IVA</th>
              <th style="text-align: right">Total</th><th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in book.entries" :key="e.id">
              <td><span class="num">{{ e.prefix }}-{{ e.consecutive }}</span></td>
              <td>{{ docTypeLabel(e.documentType) }}</td>
              <td class="date">{{ e.issueDate }}</td>
              <td>{{ e.customerName || '—' }}</td>
              <td style="text-align: right">{{ feMoney(e.base) }}</td>
              <td style="text-align: right">{{ feMoney(e.iva) }}</td>
              <td style="text-align: right; font-weight: 600">{{ feMoney(e.total) }}</td>
              <td><FeStatusPill :status="e.dianStatus" /></td>
            </tr>
            <tr v-if="book.entries.length === 0"><td colspan="8" class="empty">Sin documentos en el rango.</td></tr>
          </tbody>
        </table>
        </div>
      </div>
    </template>

    <!-- Conciliación -->
    <template v-else-if="tab === 'concil' && recon">
      <div class="cards">
        <div class="rep-card"><span>Validados</span><strong style="color: oklch(50% 0.15 150)">{{ recon.validados }}</strong></div>
        <div class="rep-card"><span>Pendientes</span><strong style="color: oklch(50% 0.16 240)">{{ recon.pendientes }}</strong></div>
        <div class="rep-card"><span>En contingencia</span><strong style="color: oklch(58% 0.14 75)">{{ recon.contingencia }}</strong></div>
        <div class="rep-card"><span>Rechazados</span><strong style="color: oklch(55% 0.2 25)">{{ recon.rechazados }}</strong></div>
      </div>

      <div class="card">
        <div class="card-title">Requieren atención ({{ recon.needsAttention.length }})</div>
        <div v-if="recon.needsAttention.length === 0" class="empty pad">
          Todos los documentos del periodo están validados.
        </div>
        <div v-else class="tbl-scroll">
        <table class="minitable">
          <thead><tr><th>Número</th><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            <tr v-for="d in recon.needsAttention" :key="d.id">
              <td><span class="num">{{ d.prefix }}-{{ d.consecutive }}</span></td>
              <td>{{ docTypeLabel(d.documentType) }}</td>
              <td class="date">{{ d.issueDate }}</td>
              <td><FeStatusPill :status="d.dianStatus" /></td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </template>
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
.repfilters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.tabs {
  display: flex;
  gap: 4px;
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 14px;
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-500);
  cursor: pointer;
}
.tab.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-600);
}
.daterange {
  display: flex;
  align-items: center;
  gap: 8px;
}
.daterange :deep(.date-wrap) {
  width: 170px;
}
.sep {
  color: var(--warm-400);
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
.loading {
  padding: 30px;
  text-align: center;
  color: var(--warm-500);
  font-size: 13px;
}
.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 1024px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
.rep-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rep-card span {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}
.rep-card strong {
  font-size: 24px;
  font-family: var(--font-serif);
  font-weight: 400;
  color: var(--warm-900);
}
.rep-card.hl {
  background: linear-gradient(135deg, var(--amatista-50), var(--warm-50));
  border-color: var(--amatista-200);
}
.cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}
.card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 18px 20px;
}
.card-title {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
}
.tbl-scroll {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.minitable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.minitable th {
  text-align: left;
  font-weight: 500;
  color: var(--warm-500);
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}
.minitable td {
  padding: 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-800);
}
.num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--amatista-700);
  font-weight: 600;
}
.date {
  color: var(--warm-500);
  font-variant-numeric: tabular-nums;
}
.empty {
  text-align: center;
  color: var(--warm-500);
}
.empty.pad {
  padding: 24px 12px;
}
</style>

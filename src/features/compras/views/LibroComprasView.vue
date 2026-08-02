<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { BookText, FileDown, RefreshCw } from 'lucide-vue-next'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { purchaseReportApi } from '../api/purchaseReport.api'
import { formatMoney, formatDate } from '../composables/format'
import type { PurchaseBook } from '../types/compras'

const branchStore = useBranchStore()
const toast = useToast()

const today = new Date()
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
const from = ref(firstOfMonth.toISOString().slice(0, 10))
const to = ref(today.toISOString().slice(0, 10))

const book = ref<PurchaseBook | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    book.value = await purchaseReportApi.purchaseBook(from.value, to.value)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el libro de compras')
  } finally {
    loading.value = false
  }
}

async function download(format: 'csv' | 'pdf') {
  try {
    await purchaseReportApi.export(from.value, to.value, format)
  } catch (e) {
    toast.error('No se pudo exportar', getProblemDetailMessage(e, 'Error al exportar'))
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="title-wrap">
        <BookText :size="22" :stroke-width="1.7" />
        <div>
          <h1>Libro de compras</h1>
          <p class="sub">
            Facturas de proveedor del periodo · sede
            {{ branchStore.selectedBranchId ? 'seleccionada' : '(todas)' }}
          </p>
        </div>
      </div>
    </header>

    <div class="controls">
      <div class="date-field">
        <label>Desde</label>
        <DateInput v-model="from" :max="to" />
      </div>
      <div class="date-field">
        <label>Hasta</label>
        <DateInput v-model="to" :min="from" />
      </div>
      <button type="button" class="btn ghost" :disabled="loading" @click="load">
        <RefreshCw :size="15" :stroke-width="1.8" /> Actualizar
      </button>
      <div class="spacer" />
      <button type="button" class="btn ghost" @click="download('csv')">
        <FileDown :size="15" :stroke-width="1.8" /> CSV
      </button>
      <button type="button" class="btn primary" @click="download('pdf')">
        <FileDown :size="15" :stroke-width="1.8" /> PDF
      </button>
    </div>

    <p v-if="error" class="server-error">{{ error }}</p>

    <div class="table-wrap">
      <table class="grid-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>NIT</th>
            <th>Factura</th>
            <th>Emisión</th>
            <th class="num">Base</th>
            <th class="num">Impuesto</th>
            <th class="num">Retención</th>
            <th class="num">Total</th>
            <th class="num">Pagado</th>
            <th class="num">Saldo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && book && book.entries.length === 0">
            <td colspan="11" class="empty-row">Sin compras en el periodo.</td>
          </tr>
          <tr v-for="e in book?.entries ?? []" :key="e.id">
            <td class="strong">{{ e.supplierName }}</td>
            <td>{{ e.supplierTaxId ?? '—' }}</td>
            <td>{{ e.invoiceNumber }}</td>
            <td>{{ formatDate(e.issueDate) }}</td>
            <td class="num">{{ formatMoney(e.subtotal) }}</td>
            <td class="num">{{ formatMoney(e.taxAmount) }}</td>
            <td class="num">{{ formatMoney(e.withholdingAmount) }}</td>
            <td class="num">{{ formatMoney(e.total) }}</td>
            <td class="num">{{ formatMoney(e.paidAmount) }}</td>
            <td class="num">{{ formatMoney(e.balance) }}</td>
            <td>{{ e.status }}</td>
          </tr>
        </tbody>
        <tfoot v-if="book && book.entries.length > 0">
          <tr>
            <td colspan="4">TOTAL ({{ book.totals.invoiceCount }})</td>
            <td class="num">{{ formatMoney(book.totals.subtotal) }}</td>
            <td class="num">{{ formatMoney(book.totals.taxAmount) }}</td>
            <td class="num">{{ formatMoney(book.totals.withholdingAmount) }}</td>
            <td class="num">{{ formatMoney(book.totals.total) }}</td>
            <td class="num">{{ formatMoney(book.totals.paidAmount) }}</td>
            <td class="num">{{ formatMoney(book.totals.balance) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 24px 28px;
  font-family: var(--font-sans);
}

.page-head {
  margin-bottom: 18px;
}

.title-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--amatista-700, #5c2d8c);
}

.title-wrap h1 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  color: var(--warm-900);
}

.sub {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--warm-500);
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.date-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

.date-field label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.spacer {
  flex: 1;
}

.table-wrap {
  overflow-x: auto;
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}

.grid-table th {
  text-align: left;
  color: var(--warm-500);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 7px;
  border-bottom: 1px solid var(--warm-200);
  white-space: nowrap;
}

.grid-table td {
  padding: 8px 7px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-700);
  white-space: nowrap;
}

.grid-table tfoot td {
  border-top: 2px solid var(--warm-300);
  font-weight: 700;
  color: var(--warm-900);
}

.strong {
  font-weight: 600;
  color: var(--warm-900);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-row {
  text-align: center;
  color: var(--warm-400);
  padding: 26px;
}

.server-error {
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: oklch(94% 0.06 25deg);
  color: oklch(45% 0.18 25deg);
  font-size: 13px;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: none;
  border-radius: 9px;
  padding: 9px 15px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn.ghost {
  background: var(--warm-100);
  color: var(--warm-700);
}

.btn.primary {
  background: var(--amatista-600, #5c2d8c);
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>

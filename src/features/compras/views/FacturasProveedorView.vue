<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ReceiptText, Plus, Pencil, Banknote, Ban, Trash2 } from 'lucide-vue-next'
import { useSupplierInvoices } from '../composables/useSupplierInvoices'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { PERMISSIONS } from '@/constants/permissions'
import { formatMoney, formatDate, invoiceStatusLabel } from '../composables/format'
import SupplierInvoiceModal from '../components/SupplierInvoiceModal.vue'
import SupplierPaymentModal from '../components/SupplierPaymentModal.vue'
import type { SupplierInvoice, SupplierInvoiceStatus } from '../types/compras'

const { items, total, loading, error, aging, agingLoading, search, loadAging, cancel, remove } =
  useSupplierInvoices()
const { can } = useAuthorization()
const branchStore = useBranchStore()
const toast = useToast()

const canCreate = can(PERMISSIONS.SUPPLIER_INVOICE_CREATE)
const canUpdate = can(PERMISSIONS.SUPPLIER_INVOICE_UPDATE)
const canDelete = can(PERMISSIONS.SUPPLIER_INVOICE_DELETE)

const tab = ref<'facturas' | 'cxp'>('facturas')
const statusFilter = ref<SupplierInvoiceStatus | ''>('')

const invoiceModal = ref(false)
const paymentModal = ref(false)
const editing = ref<SupplierInvoice | null>(null)
const paying = ref<SupplierInvoice | null>(null)

const statusOptions: { value: SupplierInvoiceStatus | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PARTIAL', label: 'Parciales' },
  { value: 'PAID', label: 'Pagadas' },
  { value: 'CANCELLED', label: 'Anuladas' },
]

function refresh() {
  void search({ status: statusFilter.value || undefined, page: 0, pageSize: 50 })
}

watch(statusFilter, refresh)
watch(
  () => branchStore.selectedBranchId,
  () => {
    refresh()
    if (tab.value === 'cxp') void loadAging()
  },
)
watch(tab, (t) => {
  if (t === 'cxp') void loadAging()
})

function statusClass(s: SupplierInvoiceStatus): string {
  return s === 'PAID'
    ? 'paid'
    : s === 'CANCELLED'
      ? 'cancelled'
      : s === 'PARTIAL'
        ? 'partial'
        : 'pending'
}

function openCreate() {
  editing.value = null
  invoiceModal.value = true
}
function openEdit(inv: SupplierInvoice) {
  editing.value = inv
  invoiceModal.value = true
}
function openPay(inv: SupplierInvoice) {
  paying.value = inv
  paymentModal.value = true
}

async function onCancel(inv: SupplierInvoice) {
  if (!window.confirm(`¿Anular la factura ${inv.invoiceNumber}?`)) return
  try {
    await cancel(inv.id)
    toast.success('Factura anulada')
    refresh()
  } catch (e) {
    toast.error('No se pudo anular', getProblemDetailMessage(e, 'Error al anular'))
  }
}
async function onDelete(inv: SupplierInvoice) {
  if (!window.confirm(`¿Eliminar la factura ${inv.invoiceNumber}?`)) return
  try {
    await remove(inv.id)
    toast.success('Factura eliminada')
    refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', getProblemDetailMessage(e, 'Error al eliminar'))
  }
}

const agingCols = computed(() => aging.value?.suppliers ?? [])

onMounted(refresh)
</script>

<template>
  <div class="ds-page ds-page--contained">
    <header class="page-head">
      <div class="title-wrap">
        <ReceiptText :size="22" :stroke-width="1.7" />
        <div>
          <h1>Facturas de proveedor</h1>
          <p class="sub">Compras registradas y cuentas por pagar</p>
        </div>
      </div>
      <button
        v-if="canCreate"
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        @click="openCreate"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nueva factura
      </button>
    </header>

    <div class="tabs">
      <button type="button" :class="{ active: tab === 'facturas' }" @click="tab = 'facturas'">
        Facturas
      </button>
      <button type="button" :class="{ active: tab === 'cxp' }" @click="tab = 'cxp'">
        Cuentas por pagar
      </button>
    </div>

    <p v-if="error" class="ds-server-error">{{ error }}</p>

    <!-- Facturas -->
    <template v-if="tab === 'facturas'">
      <div class="filter-row">
        <label>Estado</label>
        <select v-model="statusFilter" class="mini-select">
          <option v-for="o in statusOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <table class="grid-table">
        <thead>
          <tr>
            <th>Factura</th>
            <th>Proveedor</th>
            <th>Emisión</th>
            <th>Vence</th>
            <th class="num">Total</th>
            <th class="num">Saldo</th>
            <th>Estado</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && items.length === 0">
            <td colspan="8" class="empty-row">No hay facturas registradas.</td>
          </tr>
          <tr v-for="inv in items" :key="inv.id">
            <td class="strong">{{ inv.invoiceNumber }}</td>
            <td>{{ inv.supplier.name }}</td>
            <td>{{ formatDate(inv.issueDate) }}</td>
            <td>{{ formatDate(inv.dueDate) }}</td>
            <td class="num">{{ formatMoney(inv.total) }}</td>
            <td class="num">{{ formatMoney(inv.balance) }}</td>
            <td>
              <span class="pill" :class="statusClass(inv.status)">{{
                invoiceStatusLabel(inv.status)
              }}</span>
            </td>
            <td class="ds-actions">
              <button
                v-if="canUpdate && (inv.status === 'PENDING' || inv.status === 'PARTIAL')"
                type="button"
                class="icon-btn pay"
                title="Registrar abono"
                @click="openPay(inv)"
              >
                <Banknote :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canUpdate && inv.status === 'PENDING'"
                type="button"
                class="icon-btn"
                title="Editar"
                @click="openEdit(inv)"
              >
                <Pencil :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canUpdate && inv.status === 'PENDING'"
                type="button"
                class="icon-btn"
                title="Anular"
                @click="onCancel(inv)"
              >
                <Ban :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="icon-btn danger"
                title="Eliminar"
                @click="onDelete(inv)"
              >
                <Trash2 :size="15" :stroke-width="1.7" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="count">{{ total }} factura(s)</p>
    </template>

    <!-- Cuentas por pagar (aging) -->
    <template v-else>
      <p v-if="aging" class="aging-asof">Antigüedad de saldos al {{ formatDate(aging.asOf) }}</p>
      <table class="grid-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>NIT</th>
            <th class="num">Al día</th>
            <th class="num">1–30</th>
            <th class="num">31–60</th>
            <th class="num">61–90</th>
            <th class="num">+90</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!agingLoading && agingCols.length === 0">
            <td colspan="8" class="empty-row">No hay cuentas por pagar pendientes.</td>
          </tr>
          <tr v-for="row in agingCols" :key="row.supplierId">
            <td class="strong">{{ row.supplierName }}</td>
            <td>{{ row.taxId ?? '—' }}</td>
            <td class="num">{{ formatMoney(row.bucket.current) }}</td>
            <td class="num">{{ formatMoney(row.bucket.days1to30) }}</td>
            <td class="num">{{ formatMoney(row.bucket.days31to60) }}</td>
            <td class="num">{{ formatMoney(row.bucket.days61to90) }}</td>
            <td class="num over">{{ formatMoney(row.bucket.over90) }}</td>
            <td class="num strong">{{ formatMoney(row.bucket.total) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="aging && agingCols.length > 0">
          <tr>
            <td colspan="2">TOTAL</td>
            <td class="num">{{ formatMoney(aging.totals.current) }}</td>
            <td class="num">{{ formatMoney(aging.totals.days1to30) }}</td>
            <td class="num">{{ formatMoney(aging.totals.days31to60) }}</td>
            <td class="num">{{ formatMoney(aging.totals.days61to90) }}</td>
            <td class="num over">{{ formatMoney(aging.totals.over90) }}</td>
            <td class="num strong">{{ formatMoney(aging.totals.total) }}</td>
          </tr>
        </tfoot>
      </table>
    </template>

    <SupplierInvoiceModal
      :open="invoiceModal"
      :invoice="editing"
      @close="invoiceModal = false"
      @saved="refresh"
    />
    <SupplierPaymentModal
      :open="paymentModal"
      :invoice="paying"
      @close="paymentModal = false"
      @saved="
        () => {
          refresh()
          if (tab === 'cxp') loadAging()
        }
      "
    />
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.title-wrap {
  display: flex;
  gap: 12px;
  align-items: center;
  color: var(--amatista-700);
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

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--warm-200);
}

.tabs button {
  border: none;
  background: none;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--warm-500);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tabs button.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-600);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--warm-600);
}

.mini-select {
  padding: 7px 10px;
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  background: var(--warm-50);
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}

.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.grid-table th {
  text-align: left;
  color: var(--warm-500);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px;
  border-bottom: 1px solid var(--warm-200);
}

.grid-table td {
  padding: 9px 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-700);
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

.over {
  color: #b4453a;
}

.actions-col {
  width: 140px;
}

.icon-btn {
  border: none;
  background: var(--warm-100);
  color: var(--warm-600);
  border-radius: 7px;
  padding: 6px;
  cursor: pointer;
  display: inline-flex;
}

.icon-btn:hover {
  background: var(--warm-200);
}

.icon-btn.pay:hover {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.icon-btn.danger:hover {
  background: var(--danger-200);
  color: oklch(50% 0.2 25deg);
}

.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
}

.pill.pending {
  background: oklch(93% 0.07 75deg);
  color: oklch(45% 0.12 75deg);
}

.pill.partial {
  background: oklch(92% 0.07 250deg);
  color: oklch(45% 0.14 250deg);
}

.pill.paid {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.pill.cancelled {
  background: var(--warm-100);
  color: var(--warm-500);
}

.empty-row {
  text-align: center;
  color: var(--warm-400);
  padding: 26px;
}

.count {
  margin-top: 10px;
  font-size: 12px;
  color: var(--warm-500);
}

.aging-asof {
  font-size: 13px;
  color: var(--warm-500);
  margin: 0 0 12px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>

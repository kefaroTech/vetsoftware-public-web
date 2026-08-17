<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ReceiptText, Plus, Pencil, Banknote, Ban, Trash2 } from 'lucide-vue-next'
import { useSupplierInvoices } from '../composables/useSupplierInvoices'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import { formatDateNumeric } from '@/composables/format'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { invoiceStatusLabel } from '../composables/comprasLabels'
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
    toast.errorFrom('No se pudo anular', e, 'Error al anular')
  }
}
async function onDelete(inv: SupplierInvoice) {
  if (!window.confirm(`¿Eliminar la factura ${inv.invoiceNumber}?`)) return
  try {
    await remove(inv.id)
    toast.success('Factura eliminada')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo eliminar', e, 'Error al eliminar')
  }
}

const agingCols = computed(() => aging.value?.suppliers ?? [])

onMounted(refresh)
</script>

<template>
  <div class="ds-page ds-page--contained">
    <header class="page-head">
      <div class="ds-flex-row ds-flex-row--12 ds-flex-row--accent">
        <ReceiptText :size="22" :stroke-width="1.7" />
        <div>
          <h1 class="ds-display ds-display--xs">Facturas de proveedor</h1>
          <p class="ds-view-subtitle">Compras registradas y cuentas por pagar</p>
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
      <div class="filter-row ds-flex-row ds-meta-dark">
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
            <th class="ds-num">Total</th>
            <th class="ds-num">Saldo</th>
            <th>Estado</th>
            <th class="actions-col"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && items.length === 0">
            <td colspan="8" class="ds-empty ds-empty--md">No hay facturas registradas.</td>
          </tr>
          <tr v-for="inv in items" :key="inv.id">
            <td class="ds-strong">{{ inv.invoiceNumber }}</td>
            <td>{{ inv.supplier.name }}</td>
            <td>{{ formatDateNumeric(inv.issueDate) }}</td>
            <td>{{ formatDateNumeric(inv.dueDate) }}</td>
            <td class="ds-num">{{ formatMoney(inv.total) }}</td>
            <td class="ds-num">{{ formatMoney(inv.balance) }}</td>
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
      <p class="count ds-meta">{{ total }} factura(s)</p>
    </template>

    <!-- Cuentas por pagar (aging) -->
    <template v-else>
      <p v-if="aging" class="aging-asof">
        Antigüedad de saldos al {{ formatDateNumeric(aging.asOf) }}
      </p>
      <table class="grid-table">
        <thead>
          <tr>
            <th>Proveedor</th>
            <th>NIT</th>
            <th class="ds-num">Al día</th>
            <th class="ds-num">1–30</th>
            <th class="ds-num">31–60</th>
            <th class="ds-num">61–90</th>
            <th class="ds-num">+90</th>
            <th class="ds-num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!agingLoading && agingCols.length === 0">
            <td colspan="8" class="ds-empty ds-empty--md">No hay cuentas por pagar pendientes.</td>
          </tr>
          <tr v-for="row in agingCols" :key="row.supplierId">
            <td class="ds-strong">{{ row.supplierName }}</td>
            <td>{{ row.taxId ?? '—' }}</td>
            <td class="ds-num">{{ formatMoney(row.bucket.current) }}</td>
            <td class="ds-num">{{ formatMoney(row.bucket.days1to30) }}</td>
            <td class="ds-num">{{ formatMoney(row.bucket.days31to60) }}</td>
            <td class="ds-num">{{ formatMoney(row.bucket.days61to90) }}</td>
            <td class="ds-num ds-amount--neg">{{ formatMoney(row.bucket.over90) }}</td>
            <td class="ds-num ds-strong">{{ formatMoney(row.bucket.total) }}</td>
          </tr>
        </tbody>
        <tfoot v-if="aging && agingCols.length > 0">
          <tr>
            <td colspan="2">TOTAL</td>
            <td class="ds-num">{{ formatMoney(aging.totals.current) }}</td>
            <td class="ds-num">{{ formatMoney(aging.totals.days1to30) }}</td>
            <td class="ds-num">{{ formatMoney(aging.totals.days31to60) }}</td>
            <td class="ds-num">{{ formatMoney(aging.totals.days61to90) }}</td>
            <td class="ds-num ds-amount--neg">{{ formatMoney(aging.totals.over90) }}</td>
            <td class="ds-num ds-strong">{{ formatMoney(aging.totals.total) }}</td>
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
/* Primitivas: `.ds-flex-row--12 --accent` + `--display--xs` + `--view-subtitle`
   (cabecera), `.ds-flex-row --meta-dark` (filtro), `.ds-num`, `.ds-strong`,
   `.ds-amount--neg`, `.ds-meta`, `.ds-empty --md` (fila vacía; su padding/color
   los pisa `.grid-table td` a (0,2,1), igual que pisaba al `.empty-row` que
   sustituye — mismo resultado en pantalla). */
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
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
  margin-bottom: 14px;
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

.count {
  margin-top: 10px;
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

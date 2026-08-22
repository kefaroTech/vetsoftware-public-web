<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ReceiptText, Plus, Pencil, Banknote, Ban, Trash2 } from 'lucide-vue-next'
import { useSupplierInvoices } from '../composables/useSupplierInvoices'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { PERMISSIONS } from '@/constants/permissions'
import { formatDateNumeric } from '@/composables/format'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { invoiceStatusLabel } from '../composables/comprasLabels'
import SupplierInvoiceModal from '../components/SupplierInvoiceModal.vue'
import SupplierPaymentModal from '../components/SupplierPaymentModal.vue'
import ComprasIconButton from '../components/ComprasIconButton.vue'
import ComprasTable from '../components/ComprasTable.vue'
import type { SupplierInvoice, SupplierInvoiceStatus } from '../types/compras'

const { items, total, loading, error, aging, agingLoading, search, loadAging, cancel, remove } =
  useSupplierInvoices()
const { can } = useAuthorization()
const branchStore = useBranchStore()
const toast = useToast()
const { confirm } = useConfirmDialog()

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

/* El verde de "acción positiva" (`.ds-tone--compras-ok`, primitives.css) va
   como clase aparte de `paid`: la primera decide el tono, la segunda sigue
   siendo el nombre de estado que usa `.pill.paid` para lo que no comparte con
   el resto (ver más abajo). */
function statusClass(s: SupplierInvoiceStatus): (string | false)[] {
  return [
    s === 'PAID'
      ? 'paid'
      : s === 'CANCELLED'
        ? 'cancelled'
        : s === 'PARTIAL'
          ? 'partial'
          : 'pending',
    s === 'PAID' && 'ds-tone--compras-ok',
  ]
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

/**
 * Los `window.confirm()` nativos que había aquí eran la peor implementación
 * posible del concepto: rótulos en el idioma del navegador («OK»/«Cancel»), sin
 * foco gobernado, sin estilo y sin guarda de doble clic. Ahora pasan por el
 * único diálogo de la app, con la consecuencia escrita y la acción dentro.
 */
async function onCancel(inv: SupplierInvoice) {
  try {
    const ok = await confirm({
      title: 'Anular factura',
      message: `Se anulará la factura ${inv.invoiceNumber}.`,
      consequence: 'La factura deja de contar como cuenta por pagar. No se puede reactivar.',
      confirmLabel: 'Anular factura',
      busyLabel: 'Anulando…',
      action: () => cancel(inv.id),
    })
    if (!ok) return
    toast.success('Factura anulada')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo anular', e, 'Error al anular')
  }
}

async function onDelete(inv: SupplierInvoice) {
  try {
    const ok = await confirm({
      title: 'Eliminar factura',
      message: `Se eliminará la factura ${inv.invoiceNumber}.`,
      consequence: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar factura',
      busyLabel: 'Eliminando…',
      action: () => remove(inv.id),
    })
    if (!ok) return
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
      <button
        type="button"
        :class="tab === 'facturas' ? 'ds-tab--active' : 'tab-off'"
        @click="tab = 'facturas'"
      >
        Facturas
      </button>
      <button
        type="button"
        :class="tab === 'cxp' ? 'ds-tab--active' : 'tab-off'"
        @click="tab = 'cxp'"
      >
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

      <ComprasTable>
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
              <ComprasIconButton
                v-if="canUpdate && (inv.status === 'PENDING' || inv.status === 'PARTIAL')"
                title="Registrar abono"
                row
                tone="success"
                @click="openPay(inv)"
              >
                <Banknote :size="15" :stroke-width="1.7" />
              </ComprasIconButton>
              <ComprasIconButton
                v-if="canUpdate && inv.status === 'PENDING'"
                title="Editar"
                row
                @click="openEdit(inv)"
              >
                <Pencil :size="15" :stroke-width="1.7" />
              </ComprasIconButton>
              <ComprasIconButton
                v-if="canUpdate && inv.status === 'PENDING'"
                title="Anular"
                row
                @click="onCancel(inv)"
              >
                <Ban :size="15" :stroke-width="1.7" />
              </ComprasIconButton>
              <ComprasIconButton
                v-if="canDelete"
                title="Eliminar"
                row
                tone="danger"
                @click="onDelete(inv)"
              >
                <Trash2 :size="15" :stroke-width="1.7" />
              </ComprasIconButton>
            </td>
          </tr>
        </tbody>
      </ComprasTable>
      <p class="count ds-meta">{{ total }} factura(s)</p>
    </template>

    <!-- Cuentas por pagar (aging) -->
    <template v-else>
      <p v-if="aging" class="aging-asof">
        Antigüedad de saldos al {{ formatDateNumeric(aging.asOf) }}
      </p>
      <ComprasTable>
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
      </ComprasTable>
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

/* El estado activo lo pinta `.ds-tab--active` y el de reposo `.tab-off`, las dos
   desde el template. La base no declara `color` ni `border-bottom-color`: con el
   `[data-v-…]` del scope pesarían (0,2,1) y la primitiva (0,1,0) no ganaría. El
   `border-width` en forma larga evita el `border-color: currentcolor` que
   arrastra el atajo `border: none`. */
.tabs button {
  background: none;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  border-width: 0 0 2px;
  border-style: solid;
  margin-bottom: -1px;
}

.tab-off {
  border-bottom-color: transparent;
  color: var(--warm-500);
}

.filter-row {
  margin-bottom: 14px;
}

.mini-select {
  padding: 7px 10px;
  border: 1px solid var(--warm-450);
  border-radius: 8px;
  background: var(--warm-50);
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}

/* La tabla y su cabecera/celda viven en `ComprasTable.vue`, compartida por las
   tres vistas de la feature. */

.grid-table tfoot td {
  border-top: 2px solid var(--warm-300);
  font-weight: 700;
  color: var(--warm-900);
}

.actions-col {
  width: 140px;
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

/* El verde de "pagada" lo pone `.ds-tone--compras-ok` (primitives.css),
   añadida desde `statusClass` — ya no queda CSS local para `.pill.paid`. */

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

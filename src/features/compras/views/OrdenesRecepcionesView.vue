<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClipboardList, Plus, Pencil, Send, Ban, Trash2, CheckCircle2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { usePurchasesStore } from '../stores/purchases.store'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { PERMISSIONS } from '@/constants/permissions'
import { formatMoney, formatDate } from '../composables/format'
import PurchaseOrderModal from '../components/PurchaseOrderModal.vue'
import GoodsReceiptModal from '../components/GoodsReceiptModal.vue'
import type { GoodsReceiptStatus, PurchaseOrder, PurchaseOrderStatus } from '../types/compras'

const purchases = usePurchasesStore()
const { orders, receipts, error } = storeToRefs(purchases)
const { can } = useAuthorization()
const toast = useToast()

const canPoCreate = can(PERMISSIONS.PURCHASE_ORDER_CREATE)
const canPoUpdate = can(PERMISSIONS.PURCHASE_ORDER_UPDATE)
const canPoDelete = can(PERMISSIONS.PURCHASE_ORDER_DELETE)
const canGrCreate = can(PERMISSIONS.GOODS_RECEIPT_CREATE)
const canGrCancel = can(PERMISSIONS.GOODS_RECEIPT_CANCEL)

const tab = ref<'ordenes' | 'recepciones'>('ordenes')
const poModal = ref(false)
const grModal = ref(false)
const editingPo = ref<PurchaseOrder | null>(null)

const PO_STATUS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Borrador',
  PLACED: 'Emitida',
  PARTIALLY_RECEIVED: 'Parcial',
  RECEIVED: 'Recibida',
  CANCELLED: 'Anulada',
}
const GR_STATUS: Record<GoodsReceiptStatus, string> = {
  DRAFT: 'Borrador',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Anulada',
}

function poTotal(po: PurchaseOrder): number {
  return po.lines.reduce((a, l) => a + l.quantityOrdered * l.unitCost, 0)
}

function refresh() {
  void purchases.loadOrders()
  void purchases.loadReceipts()
}

function openCreatePo() {
  editingPo.value = null
  poModal.value = true
}
function openEditPo(po: PurchaseOrder) {
  editingPo.value = po
  poModal.value = true
}

async function placePo(po: PurchaseOrder) {
  try {
    await purchaseOrdersApi.place(po.id)
    toast.success('Orden emitida')
    refresh()
  } catch (e) {
    toast.error('No se pudo emitir', getProblemDetailMessage(e, 'Error al emitir'))
  }
}
async function cancelPo(po: PurchaseOrder) {
  if (!window.confirm(`¿Anular la orden #${po.id}?`)) return
  try {
    await purchaseOrdersApi.cancel(po.id)
    toast.success('Orden anulada')
    refresh()
  } catch (e) {
    toast.error('No se pudo anular', getProblemDetailMessage(e, 'Error al anular'))
  }
}
async function deletePo(po: PurchaseOrder) {
  if (!window.confirm(`¿Eliminar la orden #${po.id}?`)) return
  try {
    await purchaseOrdersApi.remove(po.id)
    toast.success('Orden eliminada')
    refresh()
  } catch (e) {
    toast.error('No se pudo eliminar', getProblemDetailMessage(e, 'Error al eliminar'))
  }
}

async function confirmGr(id: number) {
  if (!window.confirm('¿Confirmar la recepción? Esto ingresa el stock al inventario.')) return
  try {
    await goodsReceiptsApi.confirm(id)
    toast.success('Recepción confirmada · inventario actualizado')
    refresh()
  } catch (e) {
    toast.error('No se pudo confirmar', getProblemDetailMessage(e, 'Error al confirmar'))
  }
}
async function cancelGr(id: number) {
  if (!window.confirm('¿Anular la recepción? Se revertirá el stock ingresado.')) return
  try {
    await goodsReceiptsApi.cancel(id)
    toast.success('Recepción anulada')
    refresh()
  } catch (e) {
    toast.error('No se pudo anular', getProblemDetailMessage(e, 'Error al anular'))
  }
}

const orderRows = computed(() => orders.value)
const receiptRows = computed(() => receipts.value)

onMounted(refresh)
</script>

<template>
  <div class="page">
    <header class="page-head">
      <div class="title-wrap">
        <ClipboardList :size="22" :stroke-width="1.7" />
        <div>
          <h1>Órdenes y recepción</h1>
          <p class="sub">Pedidos a proveedores y entrada de mercancía al inventario</p>
        </div>
      </div>
      <button
        v-if="tab === 'ordenes' && canPoCreate"
        type="button"
        class="btn primary"
        @click="openCreatePo"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nueva orden
      </button>
      <button
        v-else-if="tab === 'recepciones' && canGrCreate"
        type="button"
        class="btn primary"
        @click="grModal = true"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nueva recepción
      </button>
    </header>

    <div class="tabs">
      <button type="button" :class="{ active: tab === 'ordenes' }" @click="tab = 'ordenes'">
        Órdenes de compra
      </button>
      <button type="button" :class="{ active: tab === 'recepciones' }" @click="tab = 'recepciones'">
        Recepciones
      </button>
    </div>

    <p v-if="error" class="server-error">{{ error }}</p>

    <!-- Órdenes -->
    <table v-if="tab === 'ordenes'" class="grid-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Proveedor</th>
          <th>Fecha</th>
          <th>Esperada</th>
          <th class="num">Total</th>
          <th>Estado</th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="orderRows.length === 0">
          <td colspan="7" class="empty-row">No hay órdenes de compra.</td>
        </tr>
        <tr v-for="po in orderRows" :key="po.id">
          <td class="strong">#{{ po.id }}</td>
          <td>{{ po.supplier.name }}</td>
          <td>{{ formatDate(po.orderDate) }}</td>
          <td>{{ formatDate(po.expectedDate) }}</td>
          <td class="num">{{ formatMoney(poTotal(po)) }}</td>
          <td>
            <span class="pill" :class="po.status.toLowerCase().replaceAll('_', '-')">
              {{ PO_STATUS[po.status] }}
            </span>
          </td>
          <td class="actions">
            <button
              v-if="canPoUpdate && po.status === 'DRAFT'"
              type="button"
              class="icon-btn"
              title="Editar"
              @click="openEditPo(po)"
            >
              <Pencil :size="15" />
            </button>
            <button
              v-if="canPoUpdate && po.status === 'DRAFT'"
              type="button"
              class="icon-btn go"
              title="Emitir"
              @click="placePo(po)"
            >
              <Send :size="15" />
            </button>
            <button
              v-if="canPoUpdate && (po.status === 'DRAFT' || po.status === 'PLACED')"
              type="button"
              class="icon-btn"
              title="Anular"
              @click="cancelPo(po)"
            >
              <Ban :size="15" />
            </button>
            <button
              v-if="canPoDelete && po.status === 'DRAFT'"
              type="button"
              class="icon-btn danger"
              title="Eliminar"
              @click="deletePo(po)"
            >
              <Trash2 :size="15" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Recepciones -->
    <table v-else class="grid-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Proveedor</th>
          <th>Fecha</th>
          <th>Factura</th>
          <th>OC</th>
          <th class="num">Líneas</th>
          <th>Estado</th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="receiptRows.length === 0">
          <td colspan="8" class="empty-row">No hay recepciones registradas.</td>
        </tr>
        <tr v-for="gr in receiptRows" :key="gr.id">
          <td class="strong">#{{ gr.id }}</td>
          <td>{{ gr.supplier.name }}</td>
          <td>{{ formatDate(gr.receiptDate) }}</td>
          <td>{{ gr.supplierInvoiceNumber ?? '—' }}</td>
          <td>{{ gr.purchaseOrderId ? '#' + gr.purchaseOrderId : '—' }}</td>
          <td class="num">{{ gr.lines.length }}</td>
          <td>
            <span class="pill" :class="gr.status.toLowerCase()">{{ GR_STATUS[gr.status] }}</span>
          </td>
          <td class="actions">
            <button
              v-if="canGrCreate && gr.status === 'DRAFT'"
              type="button"
              class="icon-btn go"
              title="Confirmar"
              @click="confirmGr(gr.id)"
            >
              <CheckCircle2 :size="15" />
            </button>
            <button
              v-if="canGrCancel && gr.status === 'CONFIRMED'"
              type="button"
              class="icon-btn"
              title="Anular"
              @click="cancelGr(gr.id)"
            >
              <Ban :size="15" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <PurchaseOrderModal
      :open="poModal"
      :order="editingPo"
      @close="poModal = false"
      @saved="refresh"
    />
    <GoodsReceiptModal
      :open="grModal"
      @close="grModal = false"
      @saved="
        () => {
          tab = 'recepciones'
          refresh()
        }
      "
    />
  </div>
</template>

<style scoped>
.page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 28px;
  font-family: var(--font-sans);
}

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
  color: var(--amatista-700, #5c2d8c);
  border-bottom-color: var(--amatista-600, #5c2d8c);
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

.strong {
  font-weight: 600;
  color: var(--warm-900);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.actions-col {
  width: 150px;
}

.actions {
  display: flex;
  gap: 5px;
  justify-content: flex-end;
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

.icon-btn.go:hover {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.icon-btn.danger:hover {
  background: oklch(92% 0.06 25deg);
  color: oklch(50% 0.2 25deg);
}

.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: var(--warm-100);
  color: var(--warm-600);
}

.pill.draft {
  background: oklch(93% 0.03 260deg);
  color: var(--warm-600);
}

.pill.placed {
  background: oklch(92% 0.07 250deg);
  color: oklch(45% 0.14 250deg);
}

.pill.partially-received {
  background: oklch(93% 0.07 75deg);
  color: oklch(45% 0.12 75deg);
}

.pill.received,
.pill.confirmed {
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

.btn.primary {
  background: var(--amatista-600, #5c2d8c);
  color: #fff;
}
</style>

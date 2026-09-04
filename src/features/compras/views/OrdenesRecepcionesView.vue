<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ClipboardList, Plus, Pencil, Send, Ban, Trash2, CheckCircle2 } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { usePurchasesStore } from '../stores/purchases.store'
import { purchaseOrdersApi } from '../api/purchaseOrders.api'
import { goodsReceiptsApi } from '../api/goodsReceipts.api'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { PERMISSIONS } from '@/constants/permissions'
import { formatDateNumeric } from '@/composables/format'
import { formatMoney } from '@/features/tienda/composables/pricing'
import PurchaseOrderModal from '../components/PurchaseOrderModal.vue'
import GoodsReceiptModal from '../components/GoodsReceiptModal.vue'
import ComprasIconButton from '../components/ComprasIconButton.vue'
import ComprasTable from '../components/ComprasTable.vue'
import Pagination from '@/components/ui/Pagination.vue'
import type { GoodsReceiptStatus, PurchaseOrder, PurchaseOrderStatus } from '../types/compras'

const purchases = usePurchasesStore()
const { orders, receipts, ordersPage, ordersTotal, receiptsPage, receiptsTotal, error } =
  storeToRefs(purchases)
const { can } = useAuthorization()
const toast = useToast()
const { confirm } = useConfirmDialog()

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

/**
 * El tono va en una clase aparte del nombre de estado porque dos estados de
 * nombre distinto comparten tono (`RECEIVED` y `CONFIRMED`) y porque `placed` y
 * `cancelled` no tienen primitiva: siguen pintándose desde el CSS local.
 */
const STATUS_TONE: Partial<Record<PurchaseOrderStatus | GoodsReceiptStatus, string>> = {
  DRAFT: 'ds-tone--neutral',
  PARTIALLY_RECEIVED: 'ds-tone--warning',
  RECEIVED: 'ds-tone--compras-ok',
  CONFIRMED: 'ds-tone--compras-ok',
}

function poPillClass(status: PurchaseOrderStatus): (string | undefined)[] {
  return [status.toLowerCase().replaceAll('_', '-'), STATUS_TONE[status]]
}
function grPillClass(status: GoodsReceiptStatus): (string | undefined)[] {
  return [status.toLowerCase(), STATUS_TONE[status]]
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
    toast.errorFrom('No se pudo emitir', e, 'Error al emitir')
  }
}
/**
 * Los cuatro `window.confirm()` nativos que había en esta vista eran la peor
 * implementación posible del concepto: rótulos en el idioma del navegador, sin
 * foco gobernado, sin estilo y sin guarda de doble clic — y DOS de ellos mueven
 * inventario. Ahora pasan por el único diálogo de la app, con la consecuencia
 * escrita y la acción dentro, así que el diálogo se queda abierto e inerte
 * mientras el POST está en vuelo.
 */
async function cancelPo(po: PurchaseOrder) {
  try {
    const ok = await confirm({
      title: 'Anular orden de compra',
      message: `Se anulará la orden #${po.id}.`,
      consequence: 'La orden queda anulada y ya no podrá recibirse.',
      confirmLabel: 'Anular orden',
      busyLabel: 'Anulando…',
      action: () => purchaseOrdersApi.cancel(po.id),
    })
    if (!ok) return
    toast.success('Orden anulada')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo anular', e, 'Error al anular')
  }
}
async function deletePo(po: PurchaseOrder) {
  try {
    const ok = await confirm({
      title: 'Eliminar orden de compra',
      message: `Se eliminará la orden #${po.id}.`,
      consequence: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar orden',
      busyLabel: 'Eliminando…',
      action: () => purchaseOrdersApi.remove(po.id),
    })
    if (!ok) return
    toast.success('Orden eliminada')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo eliminar', e, 'Error al eliminar')
  }
}

async function confirmGr(id: number) {
  try {
    const ok = await confirm({
      title: 'Confirmar recepción',
      message: `Se confirmará la recepción #${id}.`,
      consequence: 'Esto ingresa el stock al inventario de la sede y queda disponible para vender.',
      confirmLabel: 'Confirmar recepción',
      busyLabel: 'Confirmando…',
      action: () => goodsReceiptsApi.confirm(id),
    })
    if (!ok) return
    toast.success('Recepción confirmada · inventario actualizado')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo confirmar', e, 'Error al confirmar')
  }
}
async function cancelGr(id: number) {
  try {
    const ok = await confirm({
      title: 'Anular recepción',
      message: `Se anulará la recepción #${id}.`,
      consequence: 'Se revertirá el stock que esta recepción ingresó al inventario.',
      confirmLabel: 'Anular recepción',
      busyLabel: 'Anulando…',
      action: () => goodsReceiptsApi.cancel(id),
    })
    if (!ok) return
    toast.success('Recepción anulada')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo anular', e, 'Error al anular')
  }
}

const orderRows = computed(() => orders.value)
const receiptRows = computed(() => receipts.value)

// El backend numera desde 0 y el componente desde 1: la conversion se hace aqui,
// en el unico punto donde ambos se tocan.
const PAGE_SIZE = purchases.pageSize
const ordersPageCount = computed(() => Math.max(1, Math.ceil(ordersTotal.value / PAGE_SIZE)))
const receiptsPageCount = computed(() => Math.max(1, Math.ceil(receiptsTotal.value / PAGE_SIZE)))

onMounted(refresh)
</script>

<template>
  <div class="ds-page ds-page--contained">
    <header class="page-head">
      <div class="ds-flex-row ds-flex-row--12 ds-flex-row--accent">
        <ClipboardList :size="22" :stroke-width="1.7" />
        <div>
          <h1 class="ds-display ds-display--xs">Órdenes y recepción</h1>
          <p class="ds-view-subtitle">Pedidos a proveedores y entrada de mercancía al inventario</p>
        </div>
      </div>
      <button
        v-if="tab === 'ordenes' && canPoCreate"
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        @click="openCreatePo"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nueva orden
      </button>
      <button
        v-else-if="tab === 'recepciones' && canGrCreate"
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        @click="grModal = true"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nueva recepción
      </button>
    </header>

    <div class="tabs">
      <button
        type="button"
        :class="tab === 'ordenes' ? 'ds-tab--active' : 'tab-off'"
        @click="tab = 'ordenes'"
      >
        Órdenes de compra
      </button>
      <button
        type="button"
        :class="tab === 'recepciones' ? 'ds-tab--active' : 'tab-off'"
        @click="tab = 'recepciones'"
      >
        Recepciones
      </button>
    </div>

    <p v-if="error" class="ds-server-error">{{ error }}</p>

    <!-- Órdenes -->
    <ComprasTable v-if="tab === 'ordenes'">
      <thead>
        <tr>
          <th>#</th>
          <th>Proveedor</th>
          <th>Fecha</th>
          <th>Esperada</th>
          <th class="ds-num">Total</th>
          <th>Estado</th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="orderRows.length === 0">
          <td colspan="7" class="ds-empty ds-empty--md">No hay órdenes de compra.</td>
        </tr>
        <tr v-for="po in orderRows" :key="po.id">
          <td class="ds-strong">#{{ po.id }}</td>
          <td>{{ po.supplier.name }}</td>
          <td>{{ formatDateNumeric(po.orderDate) }}</td>
          <td>{{ formatDateNumeric(po.expectedDate) }}</td>
          <td class="ds-num">{{ formatMoney(poTotal(po)) }}</td>
          <td>
            <span class="pill" :class="poPillClass(po.status)">
              {{ PO_STATUS[po.status] }}
            </span>
          </td>
          <td class="ds-actions">
            <ComprasIconButton
              v-if="canPoUpdate && po.status === 'DRAFT'"
              title="Editar"
              row
              @click="openEditPo(po)"
            >
              <Pencil :size="15" />
            </ComprasIconButton>
            <ComprasIconButton
              v-if="canPoUpdate && po.status === 'DRAFT'"
              title="Emitir"
              row
              tone="success"
              @click="placePo(po)"
            >
              <Send :size="15" />
            </ComprasIconButton>
            <ComprasIconButton
              v-if="canPoUpdate && (po.status === 'DRAFT' || po.status === 'PLACED')"
              title="Anular"
              row
              @click="cancelPo(po)"
            >
              <Ban :size="15" />
            </ComprasIconButton>
            <ComprasIconButton
              v-if="canPoDelete && po.status === 'DRAFT'"
              title="Eliminar"
              row
              tone="danger"
              @click="deletePo(po)"
            >
              <Trash2 :size="15" />
            </ComprasIconButton>
          </td>
        </tr>
      </tbody>
    </ComprasTable>

    <!-- Recepciones -->
    <ComprasTable v-else>
      <thead>
        <tr>
          <th>#</th>
          <th>Proveedor</th>
          <th>Fecha</th>
          <th>Factura</th>
          <th>OC</th>
          <th class="ds-num">Líneas</th>
          <th>Estado</th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="receiptRows.length === 0">
          <td colspan="8" class="ds-empty ds-empty--md">No hay recepciones registradas.</td>
        </tr>
        <tr v-for="gr in receiptRows" :key="gr.id">
          <td class="ds-strong">#{{ gr.id }}</td>
          <td>{{ gr.supplier.name }}</td>
          <td>{{ formatDateNumeric(gr.receiptDate) }}</td>
          <td>{{ gr.supplierInvoiceNumber ?? '—' }}</td>
          <td>{{ gr.purchaseOrderId ? '#' + gr.purchaseOrderId : '—' }}</td>
          <td class="ds-num">{{ gr.lines.length }}</td>
          <td>
            <span class="pill" :class="grPillClass(gr.status)">{{ GR_STATUS[gr.status] }}</span>
          </td>
          <td class="ds-actions">
            <ComprasIconButton
              v-if="canGrCreate && gr.status === 'DRAFT'"
              title="Confirmar"
              row
              tone="success"
              @click="confirmGr(gr.id)"
            >
              <CheckCircle2 :size="15" />
            </ComprasIconButton>
            <ComprasIconButton
              v-if="canGrCancel && gr.status === 'CONFIRMED'"
              title="Anular"
              row
              @click="cancelGr(gr.id)"
            >
              <Ban :size="15" />
            </ComprasIconButton>
          </td>
        </tr>
      </tbody>
    </ComprasTable>

    <Pagination
      v-if="tab === 'ordenes'"
      :page="ordersPage + 1"
      :page-count="ordersPageCount"
      :total="ordersTotal"
      :page-size="PAGE_SIZE"
      @update:page="(p) => purchases.loadOrders(p - 1)"
    />
    <Pagination
      v-else
      :page="receiptsPage + 1"
      :page-count="receiptsPageCount"
      :total="receiptsTotal"
      :page-size="PAGE_SIZE"
      @update:page="(p) => purchases.loadReceipts(p - 1)"
    />

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
/* Primitivas: `.ds-flex-row--12 --accent` + `--display--xs` + `--view-subtitle`
   (cabecera), `.ds-num`, `.ds-strong` y `.ds-empty --md` (fila vacía; su
   padding/color los pisa `.grid-table td`, igual que al `.empty-row` anterior). */

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

/* La tabla y su cabecera/celda viven en `ComprasTable.vue`, compartida por las
   tres vistas de la feature. */

.actions-col {
  width: 150px;
}

/* Sin tono propio a propósito: el de cada estado llega desde el marcado, y una
   primitiva global (0,1,0) no podría ganarle a esta regla base, que con el
   atributo de `scoped` pesa (0,2,0). */
.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
}

.pill.placed {
  background: oklch(92% 0.07 250deg);
  color: oklch(45% 0.14 250deg);
}

.pill.cancelled {
  background: var(--warm-100);
  color: var(--warm-500);
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Boxes, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { inventoryApi } from '../api/inventory.api'
import { formatMoney } from '../composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ProductResponse } from '../types/tienda'
import type { StockLotView, StockMovementView } from '../types/inventory'

const props = defineProps<{
  open: boolean
  product: ProductResponse | null
  branchId: number | null
  branchName?: string
}>()
const emit = defineEmits<{ close: [] }>()

const tab = ref<'lots' | 'kardex'>('lots')
const lots = ref<StockLotView[]>([])
const movements = ref<StockMovementView[]>([])
const page = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const exporting = ref(false)
const PAGE_SIZE = 15

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE: 'Compra',
  SALE: 'Venta',
  ADJUSTMENT_IN: 'Ajuste +',
  ADJUSTMENT_OUT: 'Ajuste −',
  CLINICAL_USE: 'Uso clínico',
  TRANSFER_OUT: 'Transferencia (salida)',
  TRANSFER_IN: 'Transferencia (entrada)',
  VOID_IN: 'Reversa (+)',
  VOID_OUT: 'Reversa (−)',
}
const REFERENCE_LABEL: Record<string, string> = {
  POS_DOCUMENT: 'Venta POS',
  OPEN_ACCOUNT_CHARGE: 'Cuenta abierta',
  GOODS_RECEIPT: 'Recepción',
  ADJUSTMENT: 'Ajuste',
  TRANSFER: 'Transferencia',
  CLINICAL_EVENT: 'Evento clínico',
}

function movementLabel(t: string): string {
  return MOVEMENT_LABEL[t] ?? t
}
function referenceLabel(t: string): string {
  return REFERENCE_LABEL[t] ?? t
}
/** Fecha de vencimiento ISO `yyyy-MM-dd` → `dd/MM/yyyy`; '—' si no tiene. */
function fmtDate(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.slice(0, 10).split('-')
  return y && m && day ? `${day}/${m}/${y}` : '—'
}
/** Fecha-hora ISO → `dd/MM/yyyy HH:mm`. */
function fmtDateTime(d: string): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`
}

async function loadLots() {
  if (!props.product) return
  loading.value = true
  error.value = null
  try {
    lots.value = await inventoryApi.lots(props.product.id, props.branchId)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudieron cargar los lotes')
  } finally {
    loading.value = false
  }
}

async function loadKardex(p = 0) {
  if (!props.product) return
  loading.value = true
  error.value = null
  try {
    const res = await inventoryApi.kardex(props.product.id, {
      branchId: props.branchId,
      page: p,
      pageSize: PAGE_SIZE,
    })
    movements.value = res.content
    page.value = res.page
    totalPages.value = Math.max(1, res.totalPages)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el kardex')
  } finally {
    loading.value = false
  }
}

async function exportKardex(format: 'csv' | 'pdf') {
  if (!props.product) return
  exporting.value = true
  error.value = null
  try {
    await inventoryApi.exportKardex(props.product.id, { branchId: props.branchId, format })
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo exportar el kardex')
  } finally {
    exporting.value = false
  }
}

function switchTab(t: 'lots' | 'kardex') {
  if (tab.value === t) return
  tab.value = t
  if (t === 'lots') void loadLots()
  else void loadKardex(0)
}

// Regla: recargar al abrir. Arranca en "Lotes".
watch(
  () => props.open,
  (open) => {
    if (!open || !props.product) return
    tab.value = 'lots'
    lots.value = []
    movements.value = []
    page.value = 0
    void loadLots()
  },
)
</script>

<template>
  <ModalShell
    :open="open"
    title="Detalle de inventario"
    :subtitle="product ? `${product.name}${branchName ? ` · ${branchName}` : ''}` : ''"
    :icon="Boxes"
    :width="720"
    @close="emit('close')"
  >
    <template #body>
      <div class="seg" role="tablist">
        <button type="button" :class="{ on: tab === 'lots' }" @click="switchTab('lots')">
          Lotes
        </button>
        <button type="button" :class="{ on: tab === 'kardex' }" @click="switchTab('kardex')">
          Movimientos
        </button>
      </div>

      <div v-if="error" class="ds-banner ds-banner--error">{{ error }}</div>

      <!-- ── Lotes ── -->
      <table v-if="tab === 'lots'" class="table">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Vencimiento</th>
            <th class="num">Disponible</th>
            <th class="num">Costo unit.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="4" class="ds-empty">Cargando…</td>
          </tr>
          <tr v-else-if="lots.length === 0">
            <td colspan="4" class="ds-empty">Sin lotes con existencia.</td>
          </tr>
          <tr v-for="l in lots" v-else :key="l.lotId">
            <td>{{ l.lotNumber || '—' }}</td>
            <td>{{ fmtDate(l.expireDate) }}</td>
            <td class="num">{{ l.quantityAvailable }} u</td>
            <td class="num">{{ formatMoney(l.unitCost) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ── Kardex ── -->
      <template v-else>
        <div class="exportbar">
          <span class="exp-lbl">Descargar kardex</span>
          <button type="button" class="exp" :disabled="exporting" @click="exportKardex('csv')">
            CSV
          </button>
          <button type="button" class="exp" :disabled="exporting" @click="exportKardex('pdf')">
            PDF
          </button>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Origen</th>
              <th class="num">Cantidad</th>
              <th class="num">Costo unit.</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="6" class="ds-empty">Cargando…</td>
            </tr>
            <tr v-else-if="movements.length === 0">
              <td colspan="6" class="ds-empty">Sin movimientos.</td>
            </tr>
            <tr v-for="m in movements" v-else :key="m.id">
              <td class="date">{{ fmtDateTime(m.createdDate) }}</td>
              <td>{{ movementLabel(m.type) }}</td>
              <td class="ref">{{ referenceLabel(m.referenceType) }}</td>
              <td class="num" :class="m.quantity >= 0 ? 'in' : 'out'">
                {{ m.quantity >= 0 ? '+' : '' }}{{ m.quantity }}
              </td>
              <td class="num">{{ formatMoney(m.unitCost) }}</td>
              <td class="reason">{{ m.reason || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="totalPages > 1" class="pag">
          <span>Página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="pag-ctrl">
            <button type="button" :disabled="page === 0" @click="loadKardex(page - 1)">
              <ChevronLeft :size="14" />
            </button>
            <button type="button" :disabled="page + 1 >= totalPages" @click="loadKardex(page + 1)">
              <ChevronRight :size="14" />
            </button>
          </div>
        </div>
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.seg {
  display: inline-flex;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 2px;
  margin-bottom: 14px;
}
.seg button {
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-600);
  padding: 6px 14px;
  border-radius: 7px;
  cursor: pointer;
}
.seg button.on {
  background: var(--warm-50);
  color: var(--amatista-700);
  box-shadow: 0 1px 2px rgb(50 20 80 / 8%);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  overflow: hidden;
}
.table th {
  text-align: left;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 9px 12px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.table th.num {
  text-align: right;
}
.table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.num.in {
  color: oklch(45% 0.13 150deg);
  font-weight: 600;
}
.num.out {
  color: oklch(48% 0.16 25deg);
  font-weight: 600;
}
.date {
  color: var(--warm-600);
  white-space: nowrap;
}
.ref {
  color: var(--warm-600);
}
.reason {
  color: var(--warm-600);
  max-width: 200px;
}
.exportbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.exp-lbl {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-right: 2px;
}
.exp {
  padding: 5px 12px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.exp:hover:not(:disabled) {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.exp:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: var(--warm-500);
}
.pag-ctrl {
  display: flex;
  gap: 6px;
}
.pag-ctrl button {
  width: 28px;
  height: 28px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 7px;
  color: var(--warm-700);
  cursor: pointer;
  display: grid;
  place-items: center;
}
.pag-ctrl button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Boxes } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExportBar from './ExportBar.vue'
import PagerBar from './PagerBar.vue'
import SegTabs from './SegTabs.vue'
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
      <SegTabs
        :model-value="tab"
        size="md"
        :options="[
          { value: 'lots', label: 'Lotes' },
          { value: 'kardex', label: 'Movimientos' },
        ]"
        @update:model-value="switchTab"
      />

      <div v-if="error" class="ds-banner ds-banner--error">{{ error }}</div>

      <!-- ── Lotes ── -->
      <table v-if="tab === 'lots'" class="ds-table ds-table--dense">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Vencimiento</th>
            <th class="num ds-num">Disponible</th>
            <th class="num ds-num">Costo unit.</th>
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
            <td class="num ds-num">{{ l.quantityAvailable }} u</td>
            <td class="num ds-num">{{ formatMoney(l.unitCost) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- ── Kardex ── -->
      <template v-else>
        <ExportBar label="Descargar kardex" :disabled="exporting" @export="exportKardex" />
        <table class="ds-table ds-table--dense">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Movimiento</th>
              <th>Origen</th>
              <th class="num ds-num">Cantidad</th>
              <th class="num ds-num">Costo unit.</th>
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
              <td class="num ds-num" :class="m.quantity >= 0 ? 'in' : 'out'">
                {{ m.quantity >= 0 ? '+' : '' }}{{ m.quantity }}
              </td>
              <td class="num ds-num">{{ formatMoney(m.unitCost) }}</td>
              <td class="reason">{{ m.reason || '—' }}</td>
            </tr>
          </tbody>
        </table>
        <PagerBar
          v-if="totalPages > 1"
          :label="`Página ${page + 1} de ${totalPages}`"
          :prev-disabled="page === 0"
          :next-disabled="page + 1 >= totalPages"
          @prev="loadKardex(page - 1)"
          @next="loadKardex(page + 1)"
        />
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
/* El conmutador es `SegTabs`; aquí solo su hueco con lo que viene debajo. */
.seg {
  margin-bottom: 14px;
}

/* Las dos tablas (lotes y kardex) son `.ds-table ds-table--dense`
   (primitives.css); la regla `.table` local se borró entera porque la primitiva
   la REEMPLAZA, no convive con ella. El `.ds-empty` de las cuatro celdas
   `<td colspan>` vacías lo resuelve la excepción `.ds-table td.ds-empty` de
   `primitives.css` (0,2,1), que le gana a `.ds-table--dense td` (0,1,1).

   `.table th.num { text-align: right }` desaparece con ella y no hace falta
   reescribirla.

   La cifra pasó a `.ds-num` (primitives.css), que es exactamente el par
   `text-align: right` + `font-variant-numeric`. Los encabezados siguen
   alineados a la derecha porque `primitives.css` trae la excepción
   `.ds-table th.ds-num` (0,2,1), que le gana a `.ds-table th` (0,1,1); en las
   celdas no compite nadie. Sólo se queda el `white-space`, que la primitiva no
   declara, y con él los modificadores de signo `.num.in`/`.num.out`. */
.num {
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
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { History, ChevronRight, ArrowLeft } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import DiffCell from './DiffCell.vue'
import LinkButton from './LinkButton.vue'
import PagerBar from './PagerBar.vue'
import { inventoryApi } from '../api/inventory.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { InventoryCountView } from '../types/inventory'
import type { ProductResponse } from '../types/tienda'

const props = defineProps<{
  open: boolean
  branchId: number | null
  branchName?: string
  products: ProductResponse[]
}>()
const emit = defineEmits<{ close: [] }>()

const rows = ref<InventoryCountView[]>([])
const page = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const detail = ref<InventoryCountView | null>(null)
const detailLoading = ref(false)
const PAGE_SIZE = 15

const nameById = computed<Record<number, string>>(() => {
  const m: Record<number, string> = {}
  for (const p of props.products) m[p.id] = p.name
  return m
})
function nameOf(id: number): string {
  return nameById.value[id] ?? `#${id}`
}

function fmtDateTime(d: string): string {
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return d
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`
}

async function load(p = 0) {
  loading.value = true
  error.value = null
  try {
    const res = await inventoryApi.counts({
      branchId: props.branchId,
      page: p,
      pageSize: PAGE_SIZE,
    })
    rows.value = res.content
    page.value = res.page
    totalPages.value = Math.max(1, res.totalPages)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el historial de conteos')
  } finally {
    loading.value = false
  }
}

async function openDetail(id: number) {
  detailLoading.value = true
  error.value = null
  try {
    detail.value = await inventoryApi.countDetail(id)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el detalle del conteo')
  } finally {
    detailLoading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      rows.value = []
      detail.value = null
      page.value = 0
      void load(0)
    }
  },
)
</script>

<template>
  <ModalShell
    :open="open"
    :title="detail ? 'Detalle del conteo' : 'Historial de conteos'"
    :subtitle="branchName ? `Conteo físico · ${branchName}` : 'Conteo físico'"
    :icon="History"
    :width="720"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="error" class="ds-banner ds-banner--error">{{ error }}</div>

      <!-- ── Detalle de una sesión ── -->
      <template v-if="detail">
        <LinkButton class="back" @click="detail = null">
          <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al historial
        </LinkButton>
        <div class="meta">
          <span>{{ fmtDateTime(detail.createdDate) }}</span>
          <span>{{ detail.totalLines }} línea(s) · {{ detail.adjustedLines }} ajustada(s)</span>
          <span v-if="detail.note" class="note">“{{ detail.note }}”</span>
        </div>
        <table class="ds-table ds-table--dense">
          <thead>
            <tr>
              <th>Producto</th>
              <th class="num">Sistema</th>
              <th class="num">Contado</th>
              <th class="num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="detailLoading">
              <td colspan="4" class="ds-empty">Cargando…</td>
            </tr>
            <tr v-for="l in detail.lines" v-else :key="l.productId">
              <td class="tname">{{ nameOf(l.productId) }}</td>
              <td class="num sys">{{ l.systemQuantity }}</td>
              <td class="num">{{ l.countedQuantity }}</td>
              <td class="num">
                <DiffCell :value="l.difference" />
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- ── Listado de sesiones ── -->
      <template v-else>
        <table class="ds-table ds-table--dense">
          <thead>
            <tr>
              <th>Fecha</th>
              <th class="num">Líneas</th>
              <th class="num">Ajustadas</th>
              <th>Nota</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="ds-empty">Cargando…</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="5" class="ds-empty">Aún no hay conteos registrados.</td>
            </tr>
            <tr v-for="r in rows" v-else :key="r.id" class="trow" @click="openDetail(r.id)">
              <td class="date">{{ fmtDateTime(r.createdDate) }}</td>
              <td class="num">{{ r.totalLines }}</td>
              <td class="num">
                <span :class="{ badge: r.adjustedLines > 0 }">{{ r.adjustedLines }}</span>
              </td>
              <td class="tnote">{{ r.note || '—' }}</td>
              <td class="num"><ChevronRight :size="15" :stroke-width="1.7" class="chev" /></td>
            </tr>
          </tbody>
        </table>
        <PagerBar
          v-if="totalPages > 1"
          :label="`Página ${page + 1} de ${totalPages}`"
          :prev-disabled="page === 0"
          :next-disabled="page + 1 >= totalPages"
          @prev="load(page - 1)"
          @next="load(page + 1)"
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
.back {
  margin-bottom: 12px;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 12px;
  font-size: 12.5px;
  color: var(--warm-600);
}
.meta .note {
  color: var(--warm-500);
  font-style: italic;
}

/* Las dos tablas son `.ds-table ds-table--dense` (primitives.css); la regla
   `.table` local se borró entera porque la primitiva la REEMPLAZA. El
   `.ds-empty` del `<td colspan>` vacío lo resuelve la excepción
   `.ds-table td.ds-empty` de `primitives.css` (0,2,1), que le gana a
   `.ds-table--dense td` (0,1,1). */

/* NO es `.ds-row-clickable` (tiñe de amatista y sobre el `td`); ver la misma
   nota en `InventoryProductsTable`. */
.trow {
  cursor: pointer;
}
.trow:hover {
  background: var(--warm-100);
}

/* La cifra: `text-align` se separa a `td.num` porque `.ds-table th` alinea a la
   izquierda con menos peso que `.num`, y el encabezado de estas columnas iba
   alineado a la izquierda antes de migrar (lo ganaba `.table th`). */
.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
td.num {
  text-align: right;
}
.tname {
  font-weight: 500;
  color: var(--warm-900);
}
.date {
  color: var(--warm-600);
  white-space: nowrap;
}
.tnote {
  color: var(--warm-600);
}
.sys {
  color: var(--warm-600);
}
.badge {
  display: inline-flex;
  min-width: 20px;
  justify-content: center;
  padding: 1px 7px;
  border-radius: var(--radius-pill);
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-weight: 600;
  font-size: 11.5px;
}
.chev {
  color: var(--warm-400);
}
</style>

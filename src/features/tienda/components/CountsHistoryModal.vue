<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { History, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
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
      <div v-if="error" class="banner error">{{ error }}</div>

      <!-- ── Detalle de una sesión ── -->
      <template v-if="detail">
        <button type="button" class="back" @click="detail = null">
          <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al historial
        </button>
        <div class="meta">
          <span>{{ fmtDateTime(detail.createdDate) }}</span>
          <span>{{ detail.totalLines }} línea(s) · {{ detail.adjustedLines }} ajustada(s)</span>
          <span v-if="detail.note" class="note">“{{ detail.note }}”</span>
        </div>
        <table class="table">
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
              <td colspan="4" class="empty">Cargando…</td>
            </tr>
            <tr v-for="l in detail.lines" v-else :key="l.productId">
              <td class="tname">{{ nameOf(l.productId) }}</td>
              <td class="num sys">{{ l.systemQuantity }}</td>
              <td class="num">{{ l.countedQuantity }}</td>
              <td class="num">
                <span
                  class="diff"
                  :class="{
                    zero: l.difference === 0,
                    neg: l.difference < 0,
                    pos: l.difference > 0,
                  }"
                >
                  {{ l.difference > 0 ? '+' : '' }}{{ l.difference }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- ── Listado de sesiones ── -->
      <template v-else>
        <table class="table">
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
              <td colspan="5" class="empty">Cargando…</td>
            </tr>
            <tr v-else-if="rows.length === 0">
              <td colspan="5" class="empty">Aún no hay conteos registrados.</td>
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
        <div v-if="totalPages > 1" class="pag">
          <span>Página {{ page + 1 }} de {{ totalPages }}</span>
          <div class="pag-ctrl">
            <button type="button" :disabled="page === 0" @click="load(page - 1)">
              <ChevronLeft :size="14" />
            </button>
            <button type="button" :disabled="page + 1 >= totalPages" @click="load(page + 1)">
              <ChevronRight :size="14" />
            </button>
          </div>
        </div>
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner.error {
  background: oklch(95% 0.06 25deg);
  border: 1px solid oklch(85% 0.12 25deg);
  color: oklch(40% 0.18 25deg);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 12px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
}
.back:hover {
  text-decoration: underline;
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
.table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
}
.table tbody tr:last-child td {
  border-bottom: none;
}
.trow {
  cursor: pointer;
}
.trow:hover {
  background: var(--warm-100);
}
.empty {
  text-align: center;
  padding: 32px;
  color: var(--warm-500);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
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
  border-radius: 999px;
  background: var(--amatista-50);
  color: var(--amatista-700);
  font-weight: 600;
  font-size: 11.5px;
}
.diff {
  font-weight: 600;
}
.diff.zero {
  color: oklch(55% 0.12 150deg);
}
.diff.neg {
  color: oklch(52% 0.18 25deg);
}
.diff.pos {
  color: oklch(52% 0.12 70deg);
}
.chev {
  color: var(--warm-400);
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

.btn-ghost {
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 9px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { BookText, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { inventoryApi } from '../api/inventory.api'
import { formatMoney } from '../composables/pricing'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { PurchaseView } from '../types/inventory'

const props = defineProps<{ open: boolean; branchId: number | null; branchName?: string }>()
const emit = defineEmits<{ close: [] }>()

const rows = ref<PurchaseView[]>([])
const page = ref(0)
const totalPages = ref(1)
const loading = ref(false)
const error = ref<string | null>(null)
const exporting = ref(false)
const PAGE_SIZE = 15

async function exportPurchases(format: 'csv' | 'pdf') {
  exporting.value = true
  error.value = null
  try {
    await inventoryApi.exportPurchases({ branchId: props.branchId, format })
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo exportar el libro de compras')
  } finally {
    exporting.value = false
  }
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
    const res = await inventoryApi.purchases({ branchId: props.branchId, page: p, pageSize: PAGE_SIZE })
    rows.value = res.content
    page.value = res.page
    totalPages.value = Math.max(1, res.totalPages)
  } catch (e) {
    error.value = getProblemDetailMessage(e, 'No se pudo cargar el libro de compras')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      rows.value = []
      page.value = 0
      void load(0)
    }
  },
)
</script>

<template>
  <ModalShell
    :open="open"
    title="Libro de compras"
    :subtitle="branchName ? `Entradas de mercancía · ${branchName}` : 'Entradas de mercancía'"
    :icon="BookText"
    :width="760"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="error" class="banner error">{{ error }}</div>
      <div class="exportbar">
        <span class="exp-lbl">Descargar</span>
        <button type="button" class="exp" :disabled="exporting || loading" @click="exportPurchases('csv')">CSV</button>
        <button type="button" class="exp" :disabled="exporting || loading" @click="exportPurchases('pdf')">PDF</button>
      </div>
      <table class="table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Costo unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="empty">Cargando…</td></tr>
          <tr v-else-if="rows.length === 0"><td colspan="5" class="empty">Sin compras registradas.</td></tr>
          <tr v-for="r in rows" v-else :key="r.id">
            <td class="date">{{ fmtDateTime(r.createdDate) }}</td>
            <td>{{ r.productName }} <span class="sku">{{ r.productCode }}</span></td>
            <td class="num">{{ r.quantity }} u</td>
            <td class="num">{{ formatMoney(r.unitCost) }}</td>
            <td class="num total">{{ formatMoney(r.total) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="totalPages > 1" class="pag">
        <span>Página {{ page + 1 }} de {{ totalPages }}</span>
        <div class="pag-ctrl">
          <button type="button" :disabled="page === 0" @click="load(page - 1)"><ChevronLeft :size="14" /></button>
          <button type="button" :disabled="page + 1 >= totalPages" @click="load(page + 1)"><ChevronRight :size="14" /></button>
        </div>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 12px; }
.table { width: 100%; border-collapse: collapse; font-size: 12.5px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px; overflow: hidden; }
.table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; padding: 9px 12px; background: var(--warm-100); border-bottom: 1px solid var(--warm-200); }
.table td { padding: 9px 12px; border-bottom: 1px solid var(--warm-150); color: var(--warm-800); }
.table tbody tr:last-child td { border-bottom: none; }
.empty { text-align: center; padding: 32px; color: var(--warm-500); }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.total { font-weight: 600; color: var(--warm-900); }
.date { color: var(--warm-600); white-space: nowrap; }
.sku { font-family: var(--font-mono); font-size: 11px; color: var(--warm-500); }
.exportbar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.exp-lbl { font-size: 11.5px; color: var(--warm-500); margin-right: 2px; }
.exp { padding: 5px 12px; border-radius: 7px; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; }
.exp:hover:not(:disabled) { background: var(--amatista-50); border-color: var(--amatista-300); color: var(--amatista-700); }
.exp:disabled { opacity: 0.5; cursor: not-allowed; }
.pag { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 12px; color: var(--warm-500); }
.pag-ctrl { display: flex; gap: 6px; }
.pag-ctrl button { width: 28px; height: 28px; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 7px; color: var(--warm-700); cursor: pointer; display: grid; place-items: center; }
.pag-ctrl button:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>

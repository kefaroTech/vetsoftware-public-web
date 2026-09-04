<script setup lang="ts">
import { ref, watch } from 'vue'
import { BookText } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import ExportBar from './ExportBar.vue'
import PagerBar from './PagerBar.vue'
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
    const res = await inventoryApi.purchases({
      branchId: props.branchId,
      page: p,
      pageSize: PAGE_SIZE,
    })
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
      <div v-if="error" class="ds-banner ds-banner--error">{{ error }}</div>
      <ExportBar label="Descargar" :disabled="exporting || loading" @export="exportPurchases" />
      <table class="ds-table ds-table--dense">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Producto</th>
            <th class="ds-num">Cantidad</th>
            <th class="ds-num">Costo unit.</th>
            <th class="ds-num">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="ds-empty">Cargando…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="5" class="ds-empty">Sin compras registradas.</td>
          </tr>
          <tr v-for="r in rows" v-else :key="r.id">
            <td class="date">{{ fmtDateTime(r.createdDate) }}</td>
            <td>
              {{ r.productName }}
              <span class="sku ds-meta ds-meta--caption">{{ r.productCode }}</span>
            </td>
            <td class="num ds-num">{{ r.quantity }} u</td>
            <td class="num ds-num">{{ formatMoney(r.unitCost) }}</td>
            <td class="num ds-num total">{{ formatMoney(r.total) }}</td>
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

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La tabla es `.ds-table ds-table--dense` (primitives.css); la regla `.table`
   local se borró entera para que la primitiva la sustituya en vez de competir
   con ella. El `.ds-empty` del `<td colspan>` vacío lo resuelve la excepción
   `.ds-table td.ds-empty` de `primitives.css` (0,2,1), que le gana a
   `.ds-table--dense td` (0,1,1).
   La cifra la marcan `.ds-num` (primitives.css) tanto en el `<th>` —donde la
   alinea la excepción `.ds-table th.ds-num`— como en el `<td>`; de la regla
   local sólo sobrevive el `white-space`, que la primitiva no declara. */
.num,
.date {
  white-space: nowrap;
}
.total {
  font-weight: 600;
  color: var(--warm-900);
}
.date {
  color: var(--warm-600);
}

/* El par color+tamaño del SKU es `.ds-meta ds-meta--caption` (primitives.css:
   warm-500 + 11px). Va sobre el `<span>`, no sobre el `<td>`, así que
   `.ds-table--dense td` no compite. Sólo queda la fuente mono. */
.sku {
  font-family: var(--font-mono);
}
</style>

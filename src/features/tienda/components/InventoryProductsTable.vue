<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowLeftRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  PauseCircle,
  Search,
  SlidersHorizontal,
  Syringe,
} from 'lucide-vue-next'
import StockStatePill from './StockStatePill.vue'
import { formatMoney, stateOf, stockOf, taxTreatmentLabel } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
import type { CategoryResponse, ProductResponse, StockState } from '../types/tienda'
import type { StockView } from '../types/inventory'

/**
 * Pestaña "Activos": filtros, tabla del catálogo y paginación.
 *
 * Sale de `InventarioView`, que tenía dos tablas completas (activos y pausados)
 * en el mismo template. Los saldos llegan como el mapa crudo de la sede y el
 * componente deriva cantidad/estado con los helpers de `pricing`, en vez de
 * recibir `stockOf`/`stateOf` como props: son funciones puras.
 *
 * La paginación es local a la lista filtrada, igual que antes — el filtrado
 * ocurre en cliente sobre el catálogo ya cargado.
 */
const props = defineProps<{
  products: ProductResponse[]
  categories: CategoryResponse[]
  stockByProduct: Record<number, StockView>
  loading: boolean
  showStock: boolean
  // `canUpdate` no viaja: quien decide si la fila abre el editor es el handler
  // de `rowClick` en la vista, que ya comprueba el permiso.
  canDelete: boolean
  canAdjust: boolean
  canTransfer: boolean
  hasTransferTargets: boolean
}>()

const emit = defineEmits<{
  rowClick: [product: ProductResponse]
  detail: [product: ProductResponse]
  restock: [product: ProductResponse]
  adjust: [product: ProductResponse]
  transfer: [product: ProductResponse]
  consume: [product: ProductResponse]
  pause: [product: ProductResponse]
  minStockCommit: [product: ProductResponse, event: Event]
}>()

const query = defineModel<string>('query', { required: true })
const cat = defineModel<string>('cat', { required: true })
const stState = defineModel<'' | StockState | 'REPONER'>('stState', { required: true })
const page = defineModel<number>('page', { required: true })

const PAGE_SIZE = 10

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.products.filter((p) => {
    if (cat.value && String(p.productCategory.id) !== cat.value) return false
    if (stState.value) {
      const s = stateOf(props.stockByProduct, p.id)
      if (stState.value === 'REPONER' ? s === 'OK' : s !== stState.value) return false
    }
    if (
      q &&
      !(
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.provider ?? '').toLowerCase().includes(q)
      )
    )
      return false
    return true
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const slice = computed(() =>
  filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)

function rowStock(p: ProductResponse) {
  return stockOf(props.stockByProduct, p.id)
}
</script>

<template>
  <div class="filters">
    <div class="search">
      <Search :size="15" :stroke-width="1.7" class="s-icon" />
      <input v-model="query" type="search" placeholder="Buscar nombre, SKU o proveedor…" />
    </div>
    <select v-model="cat" class="fsel">
      <option value="">Todas las categorías</option>
      <option v-for="c in categories" :key="c.id" :value="String(c.id)">
        {{ c.name }}
      </option>
    </select>
    <select v-model="stState" class="fsel">
      <option value="">Todo estado</option>
      <option value="REPONER">Por reponer</option>
      <option value="OK">En stock</option>
      <option value="BAJO">Stock bajo</option>
      <option value="AGOTADO">Agotado</option>
    </select>
  </div>

  <table class="table">
    <thead>
      <tr>
        <th>Producto</th>
        <th>Categoría</th>
        <th>SKU</th>
        <th>Precio venta</th>
        <th>IVA</th>
        <th>Stock</th>
        <th>Mínimo</th>
        <th>Estado</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="loading">
        <td colspan="9" class="ds-empty ds-empty--lg">Cargando…</td>
      </tr>
      <tr v-else-if="slice.length === 0">
        <td colspan="9" class="ds-empty ds-empty--lg">Sin productos para el filtro.</td>
      </tr>
      <tr v-for="p in slice" v-else :key="p.id" class="trow" @click="emit('rowClick', p)">
        <td class="tname">{{ p.name }}</td>
        <td>
          <span
            class="catpill"
            :style="{
              background: productCategoryTone(p.productCategory).bg,
              color: productCategoryTone(p.productCategory).fg,
            }"
            >{{ p.productCategory.name }}</span
          >
        </td>
        <td class="tsku">{{ p.code }}</td>
        <td>{{ formatMoney(p.salePrice) }}</td>
        <td class="ttax">{{ taxTreatmentLabel(p.taxTreatment) }}</td>
        <td class="tstock">{{ showStock ? `${rowStock(p).quantity} u` : '—' }}</td>
        <td class="tmin" @click.stop>
          <input
            v-if="showStock && canAdjust"
            class="min-input"
            type="number"
            min="0"
            :value="rowStock(p).minStock"
            @change="emit('minStockCommit', p, $event)"
          />
          <span v-else>{{ showStock ? rowStock(p).minStock : '—' }}</span>
        </td>
        <td>
          <StockStatePill v-if="showStock" :state="stateOf(stockByProduct, p.id)" /><span
            v-else
            class="muted"
            >—</span
          >
        </td>
        <td class="tactions" @click.stop>
          <button
            v-if="showStock"
            type="button"
            class="iconbtn"
            title="Ver lotes y kardex"
            @click="emit('detail', p)"
          >
            <Boxes :size="15" :stroke-width="1.7" />
          </button>
          <button
            v-if="canAdjust && showStock"
            type="button"
            class="restock"
            @click="emit('restock', p)"
          >
            Entrada
          </button>
          <button
            v-if="canAdjust && showStock"
            type="button"
            class="iconbtn"
            title="Ajustar"
            @click="emit('adjust', p)"
          >
            <SlidersHorizontal :size="15" :stroke-width="1.7" />
          </button>
          <button
            v-if="canTransfer && showStock && hasTransferTargets"
            type="button"
            class="iconbtn"
            title="Transferir"
            @click="emit('transfer', p)"
          >
            <ArrowLeftRight :size="15" :stroke-width="1.7" />
          </button>
          <button
            v-if="canAdjust && showStock"
            type="button"
            class="iconbtn"
            title="Consumo clínico"
            @click="emit('consume', p)"
          >
            <Syringe :size="15" :stroke-width="1.7" />
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="pause"
            title="Pausar"
            @click="emit('pause', p)"
          >
            <PauseCircle :size="15" :stroke-width="1.7" />
          </button>
        </td>
      </tr>
    </tbody>
  </table>

  <div v-if="pageCount > 1" class="pag">
    <span>{{ filtered.length }} productos · página {{ page }} de {{ pageCount }}</span>
    <div class="pag-ctrl">
      <button type="button" :disabled="page === 1" @click="page--">
        <ChevronLeft :size="14" />
      </button>
      <button type="button" :disabled="page === pageCount" @click="page++">
        <ChevronRight :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.search {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 13px;
  max-width: 340px;
  flex: 1;
}
.search:focus-within {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.s-icon {
  color: var(--warm-500);
  flex-shrink: 0;
}
.search input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  min-width: 0;
}
.fsel {
  appearance: none;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 9px;
  padding: 10px 30px 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-800);
  cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23999' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 11px center;
}
.fsel:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.table th {
  text-align: left;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--warm-500);
  font-weight: 600;
  padding: 11px 14px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.table td {
  padding: 11px 14px;
  border-bottom: 1px solid var(--warm-150);
  color: var(--warm-800);
  vertical-align: middle;
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
.tname {
  font-weight: 500;
  color: var(--warm-900);
}
.tsku {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--warm-600);
}
.tstock {
  font-weight: 600;
}
.ttax {
  color: var(--warm-600);
  font-size: 12.5px;
}
.muted {
  color: var(--warm-400);
}
.min-input {
  width: 64px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 7px;
  padding: 5px 8px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-800);
}
.min-input:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.catpill {
  display: inline-flex;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--warm-150);
  color: var(--warm-700);
}
.tactions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.restock {
  padding: 5px 11px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
}
.restock:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.iconbtn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-600);
  cursor: pointer;
}
.iconbtn:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.pause {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: transparent;
  color: var(--warm-600);
  cursor: pointer;
}
.pause:hover {
  background: oklch(96% 0.04 80deg);
  color: oklch(45% 0.12 70deg);
  border-color: oklch(88% 0.08 80deg);
}
.pag {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--warm-500);
}
.pag-ctrl {
  display: flex;
  gap: 6px;
}
.pag-ctrl button {
  width: 30px;
  height: 30px;
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
.pag-ctrl button:hover:not(:disabled) {
  background: var(--warm-100);
}

@media (width <= 760px) {
  .filters {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }
  .search,
  .fsel {
    width: 100%;
    max-width: none;
  }
  .table {
    display: block;
    overflow-x: auto;
  }
}
</style>

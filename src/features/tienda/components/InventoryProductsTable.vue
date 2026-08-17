<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeftRight, Boxes, PauseCircle, SlidersHorizontal, Syringe } from 'lucide-vue-next'
import StockStatePill from './StockStatePill.vue'
import CategoryPill from './CategoryPill.vue'
import FilterSelect from './FilterSelect.vue'
import PagerBar from './PagerBar.vue'
import SearchField from './SearchField.vue'
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

/** El `<select>` compartido habla en `string`; el filtro tiene su propia unión. */
function onStateFilter(value: string) {
  stState.value = value as '' | StockState | 'REPONER'
}
</script>

<template>
  <div class="filters">
    <SearchField v-model="query" fill placeholder="Buscar nombre, SKU o proveedor…" />
    <FilterSelect v-model="cat">
      <option value="">Todas las categorías</option>
      <option v-for="c in categories" :key="c.id" :value="String(c.id)">
        {{ c.name }}
      </option>
    </FilterSelect>
    <FilterSelect :model-value="stState" @update:model-value="onStateFilter">
      <option value="">Todo estado</option>
      <option value="REPONER">Por reponer</option>
      <option value="OK">En stock</option>
      <option value="BAJO">Stock bajo</option>
      <option value="AGOTADO">Agotado</option>
    </FilterSelect>
  </div>

  <table class="ds-table">
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
          <CategoryPill
            :tone="productCategoryTone(p.productCategory)"
            :label="p.productCategory.name"
          />
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

  <PagerBar
    v-if="pageCount > 1"
    size="md"
    :label="`${filtered.length} productos · página ${page} de ${pageCount}`"
    :prev-disabled="page === 1"
    :next-disabled="page === pageCount"
    @prev="page--"
    @next="page++"
  />
</template>

<style scoped>
.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

/* La tabla es `.ds-table` (primitives.css). No queda ninguna regla `.table`
   local: la primitiva la REEMPLAZA, no compite con ella.

   El `.ds-empty ds-empty--lg` del `<td colspan>` vacío lo resuelve la
   excepción `.ds-table td.ds-empty--lg` de `primitives.css` (0,2,1), que le
   gana a `.ds-table td` (0,1,1). Se arregla allí y no aquí a propósito: subir
   el peso desde el SFC es justo lo que rompió tres overrides deliberados en la
   pasada anterior. */
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

@media (width <= 760px) {
  .filters {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  /* `SearchField` y `FilterSelect` traen su piel, pero el ancho es cosa de esta
     barra de filtros: sus raíces siguen llevando el `data-v` de este archivo. */
  .search,
  .fsel {
    width: 100%;
    max-width: none;
  }
  .ds-table {
    display: block;
    overflow-x: auto;
  }
}
</style>

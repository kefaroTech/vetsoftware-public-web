<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { ArrowLeftRight, Boxes, PauseCircle, SlidersHorizontal, Syringe } from 'lucide-vue-next'
import StockStatePill from './StockStatePill.vue'
import CategoryPill from './CategoryPill.vue'
import FilterSelect from './FilterSelect.vue'
import PagerBar from './PagerBar.vue'
import SearchField from './SearchField.vue'
import { formatMoney, stateOf, stockOf, taxTreatmentLabel } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
import { useScrollableRegion } from '@/composables/useScrollableRegion'
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

const scroller = useTemplateRef<HTMLElement>('scroller')
const desborda = useScrollableRegion(scroller)
</script>

<template>
  <div class="filters ds-stack-mobile">
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

  <div
    ref="scroller"
    class="ds-table-scroll ds-focus-ring"
    role="region"
    aria-label="Productos del inventario"
    :tabindex="desborda ? 0 : undefined"
  >
    <table class="ds-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Categoría</th>
          <th>SKU</th>
          <th class="ds-num">Precio venta</th>
          <th>IVA</th>
          <th class="ds-num">Stock</th>
          <th class="ds-num">Mínimo</th>
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
        <tr
          v-for="p in slice"
          v-else
          :key="p.id"
          class="trow ds-row-hover"
          @click="emit('rowClick', p)"
        >
          <td class="tname ds-text-strong">{{ p.name }}</td>
          <td>
            <CategoryPill
              :tone="productCategoryTone(p.productCategory)"
              :label="p.productCategory.name"
            />
          </td>
          <td class="tsku">{{ p.code }}</td>
          <td class="ds-num">{{ formatMoney(p.salePrice) }}</td>
          <td class="ttax">{{ taxTreatmentLabel(p.taxTreatment) }}</td>
          <td class="tstock ds-num">{{ showStock ? `${rowStock(p).quantity} u` : '—' }}</td>
          <td class="tmin ds-num" @click.stop>
            <input
              v-if="showStock && canAdjust"
              class="min-input ds-focus-ring"
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
              class="iconbtn ds-icon-btn ds-icon-btn--accent"
              title="Ver lotes y kardex"
              @click="emit('detail', p)"
            >
              <Boxes :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canAdjust && showStock"
              type="button"
              class="restock ds-hover-accent"
              @click="emit('restock', p)"
            >
              Entrada
            </button>
            <button
              v-if="canAdjust && showStock"
              type="button"
              class="iconbtn ds-icon-btn ds-icon-btn--accent"
              title="Ajustar"
              @click="emit('adjust', p)"
            >
              <SlidersHorizontal :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canTransfer && showStock && hasTransferTargets"
              type="button"
              class="iconbtn ds-icon-btn ds-icon-btn--accent"
              title="Transferir"
              @click="emit('transfer', p)"
            >
              <ArrowLeftRight :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canAdjust && showStock"
              type="button"
              class="iconbtn ds-icon-btn ds-icon-btn--accent"
              title="Consumo clínico"
              @click="emit('consume', p)"
            >
              <Syringe :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="pause ds-icon-btn"
              title="Pausar"
              @click="emit('pause', p)"
            >
              <PauseCircle :size="15" :stroke-width="1.7" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

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

/* NO es `.ds-row-clickable`: esa primitiva tiñe con amatista-50 y lo hace sobre
   los `td`, no sobre la fila, además de añadir una transición. La fila gris
   (`warm-100` sobre el `<tr>`) sí tiene primitiva desde la 2ª vuelta de FE-08:
   `.ds-row-hover`, que va en el marcado. Aquí solo queda el cursor. */
.trow {
  cursor: pointer;
}

/* Migración completa (auditoría FE-08, fase final): `.ds-text-strong`
   (primitives.css) va en el `<td>` y aporta tanto el `font-weight` como el
   `color`, éste vía la excepción `.ds-table td.ds-text-strong`, que le gana a
   `.ds-table td` (0,1,1) por nombre — ya no queda CSS local para esta celda.
   `.ds-item-label` / `.ds-strong` siguen sin servir aquí: además de tener el
   mismo problema de especificidad, fijan tamaño o peso 600. */

/* SKU e impuesto comparten tono, así que comparten regla; cada uno conserva su
   tamaño. El tono no puede venir de `.ds-meta-dark` (warm-600 pero 13px fijos,
   y además perdería contra `.ds-table td`). */
.tsku,
.ttax {
  color: var(--warm-600);
}
.tsku {
  font-family: var(--font-mono);
  font-size: 12px;
}
.tstock {
  font-weight: 600;
}
.ttax {
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

/* El par borde+anillo es `.ds-focus-ring`; sólo queda quitar el contorno
   nativo, que la primitiva no toca. */
.min-input:focus {
  outline: none;
}
.tactions {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* Botón de texto: la geometría es suya (5/11, 12px) pero el tinte del hover es
   `.ds-hover-accent`, que coincidía en las tres declaraciones. */
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

/* Las tres acciones por fila son `.ds-icon-btn` (28×28, radio 7, contorno
   warm-200) con el hover de `--accent`. De las nueve declaraciones de cada una
   sólo se desvían el relleno y el tono del icono en reposo, que se quedan aquí
   sobrescritos por su propio nombre. */
.iconbtn {
  background: var(--warm-50);
  color: var(--warm-600);
}

/* Mismo botón de icono, pero su hover es ámbar (pausar), no de acento. */
.pause {
  color: var(--warm-600);
}

/* El selector nombra también la primitiva a propósito: `.ds-icon-btn:hover`
   pesa (0,3,0) igual que `.pause:hover`, y un empate lo desempataría el orden
   de inserción del bundle. Nombrando las dos clases esta desviación sube a
   (0,4,0) y gana siempre — es el mismo recurso que usa `CountSheetModal` para
   acotar su densidad de celda. */

/* `--warning-border` (3,56:1) y no `oklch(88% 0.08 80deg)` (1,28:1): el reposo
   de `.ds-icon-btn` es `--warm-450` (3,54:1) y este hover lo dejaba muy por
   debajo del 3:1 de WCAG 2.2 §1.4.11. */
.ds-icon-btn.pause:hover {
  background: var(--warning-50);
  color: var(--warning-900);
  border-color: var(--warning-border);
}

@media (width <= 760px) {
  /* `.filters` apilaba con `width: 100%; flex-direction: column` (sin
     `align-items: stretch`: la base no fija `align-items`, así que el valor
     inicial ya era `stretch`). Ese cuerpo es ahora `.ds-stack-mobile`
     (primitives.css, auditoría FE-08 fase final), aplicada desde el
     marcado — el `align-items: stretch` que añade es el mismo valor que ya
     estaba activo por defecto, así que no cambia nada. */

  /* `SearchField` y `FilterSelect` traen su piel, pero el ancho es cosa de esta
     barra de filtros: sus raíces siguen llevando el `data-v` de este archivo.
     El `max-width` se separa porque sólo `SearchField` declara uno propio
     (`.search--fill`); `.fsel` nunca tuvo ninguno que anular. */
  .search,
  .fsel {
    width: 100%;
  }
  .search {
    max-width: none;
  }
}
</style>

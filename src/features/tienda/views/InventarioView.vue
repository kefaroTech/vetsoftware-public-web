<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bell, ChevronLeft, ChevronRight, PauseCircle, Package, Plus, RotateCcw, Search } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import StockStatePill from '../components/StockStatePill.vue'
import ProductFormModal from '../components/ProductFormModal.vue'
import RestockModal from '../components/RestockModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney, isBelowCost, marginPct, stockState, taxTreatmentLabel } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import type { ProductPayload, ProductResponse, StockState } from '../types/tienda'

const CONFLICT_MESSAGE =
  'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.'

const store = useTienda()
const toast = useToast()
const { can, canAny } = useAuthorization()
const canCreate = can(PERMISSIONS.PRODUCT_CREATE)
const canUpdate = can(PERMISSIONS.PRODUCT_UPDATE)
const canDelete = can(PERMISSIONS.PRODUCT_DELETE)
const canCatCreate = can(PERMISSIONS.PRODUCT_CATEGORY_CREATE)
const canCatUpdate = can(PERMISSIONS.PRODUCT_CATEGORY_UPDATE)
const canCatDelete = can(PERMISSIONS.PRODUCT_CATEGORY_DELETE)
const canManageCategories = canAny(
  PERMISSIONS.PRODUCT_CATEGORY_CREATE,
  PERMISSIONS.PRODUCT_CATEGORY_UPDATE,
  PERMISSIONS.PRODUCT_CATEGORY_DELETE,
)

/** 'active' = catálogo vivo; 'paused' = productos pausados (enabled=false) para reactivar. */
const mode = ref<'active' | 'paused'>('active')

const query = ref('')
const cat = ref('')
const stState = ref<'' | StockState | 'REPONER'>('')
const page = ref(1)
const PAGE_SIZE = 10

const modalOpen = ref(false)
const editing = ref<ProductResponse | null>(null)
const restockFor = ref<ProductResponse | null>(null)
const categoriesOpen = ref(false)
const pausing = ref<ProductResponse | null>(null)
const pausingBusy = ref(false)
const pausedLoading = ref(false)

onMounted(() => store.reload())

const lowCount = computed(() => store.products.value.filter((p) => stockState(p) !== 'OK').length)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.products.value.filter((p) => {
    if (cat.value && String(p.productCategory.id) !== cat.value) return false
    if (stState.value) {
      const s = stockState(p)
      // 'REPONER' agrupa BAJO + AGOTADO (todo lo que no está OK).
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

watch([query, cat, stState], () => { page.value = 1 })

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const slice = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))

const categoryCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {}
  for (const p of store.products.value) counts[p.productCategory.id] = (counts[p.productCategory.id] ?? 0) + 1
  return counts
})

async function switchMode(m: 'active' | 'paused') {
  if (mode.value === m) return
  mode.value = m
  page.value = 1
  if (m === 'paused') {
    pausedLoading.value = true
    try {
      await store.loadPausedProducts()
    } catch (e) {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudieron cargar los pausados'))
    } finally {
      pausedLoading.value = false
    }
  }
}

function showLowStock() {
  mode.value = 'active'
  stState.value = 'REPONER'
}

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onRowClick(item: ProductResponse) {
  // Fila editable solo si el usuario puede actualizar (evita abrir el modal sin permiso).
  if (canUpdate.value) editing.value = item
}
function onSaved(item: ProductResponse) {
  const wasEdit = editing.value !== null
  toast.success('Producto guardado', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió al inventario.`)
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/** Formatea la fecha de vencimiento ISO `yyyy-MM-dd` a `dd/MM/yyyy`; '—' si no tiene. */
function formatExpire(d: string | null): string {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return y && m && day ? `${day}/${m}/${y}` : '—'
}

/** Margen % (sobre precio de venta) formateado; '—' si no calculable. */
function marginText(p: ProductResponse): string {
  const m = marginPct(p)
  return m == null ? '—' : `${Math.round(m)}%`
}

function toPayload(p: ProductResponse, currentStock: number): ProductPayload {
  return {
    name: p.name,
    code: p.code,
    purchasePrice: p.purchasePrice,
    salePrice: p.salePrice,
    currentStock,
    minStock: p.minStock,
    provider: p.provider,
    taxTreatment: p.taxTreatment,
    expireDate: p.expireDate,
    lotNumber: p.lotNumber,
    notes: p.notes,
    productCategoryId: p.productCategory.id,
    taxId: p.tax?.id ?? null,
    version: p.version,
  }
}

async function onRestock(qty: number) {
  const p = restockFor.value
  if (!p) return
  try {
    await store.updateProduct(p.id, toPayload(p, p.currentStock + qty))
    toast.success('Stock actualizado', `Se agregaron ${qty} u. a ${p.name}.`)
    restockFor.value = null
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      await store.refresh()
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
      restockFor.value = null
    } else {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo reabastecer'))
    }
  }
}

/** Pausar = soft-delete (DELETE → enabled=false). El producto es recuperable desde "Pausados". */
async function onConfirmPause() {
  const t = pausing.value
  if (!t) return
  pausingBusy.value = true
  try {
    await store.removeProduct(t.id)
    toast.info('Producto pausado', `${t.name} dejó de aparecer en el punto de venta. Puedes reactivarlo cuando quieras.`)
    pausing.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo pausar el producto'))
  } finally {
    pausingBusy.value = false
  }
}

async function onReactivate(p: ProductResponse) {
  try {
    await store.enableProduct(p.id)
    toast.success('Producto reactivado', `${p.name} volvió al catálogo activo.`)
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo reactivar el producto'))
  }
}

async function onCategoryUpsert(p: { id: number | null; name: string; description: string; version?: number }) {
  try {
    if (p.id) await store.updateProductCategory(p.id, p.name, p.description, p.version ?? 0)
    else await store.createProductCategory(p.name, p.description)
    toast.success('Categoría guardada')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      await store.refresh()
      toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    } else {
      toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo guardar la categoría'))
    }
  }
}
async function onCategoryRemove(id: number) {
  try {
    await store.removeProductCategory(id)
    toast.info('Categoría eliminada')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar la categoría'))
  }
}
</script>

<template>
  <div class="inv">
    <header class="head">
      <div>
        <div class="kicker">Tienda · Inventario</div>
        <h1 class="title">Inventario de productos</h1>
      </div>
      <div class="head-actions">
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: mode === 'active' }" @click="switchMode('active')">Activos</button>
          <button type="button" :class="{ on: mode === 'paused' }" @click="switchMode('paused')">Pausados</button>
        </div>
        <button v-if="canManageCategories" type="button" class="ghost-cta" @click="categoriesOpen = true">
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button v-if="canCreate && mode === 'active'" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nuevo producto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div v-if="mode === 'active' && lowCount > 0" class="alert" role="button" tabindex="0" @click="showLowStock" @keyup.enter="showLowStock">
      <Bell :size="15" :stroke-width="1.8" />
      <span><strong>{{ lowCount }}</strong> producto(s) con stock bajo o agotado — ver por reponer</span>
    </div>

    <!-- ─────────── Modo ACTIVOS ─────────── -->
    <template v-if="mode === 'active'">
      <div class="filters">
        <div class="search">
          <Search :size="15" :stroke-width="1.7" class="s-icon" />
          <input v-model="query" type="search" placeholder="Buscar nombre, SKU o proveedor…" />
        </div>
        <select v-model="cat" class="fsel">
          <option value="">Todas las categorías</option>
          <option v-for="c in store.productCategories.value" :key="c.id" :value="String(c.id)">{{ c.name }}</option>
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
            <th>Margen</th>
            <th>IVA</th>
            <th>Stock</th>
            <th>Estado</th>
            <th>Vence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading.value">
            <td colspan="10" class="empty">Cargando…</td>
          </tr>
          <tr v-else-if="slice.length === 0">
            <td colspan="10" class="empty">Sin productos para el filtro.</td>
          </tr>
          <tr v-for="p in slice" v-else :key="p.id" class="trow" @click="onRowClick(p)">
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
            <td class="tmargin" :class="{ below: isBelowCost(p) }" :title="isBelowCost(p) ? 'Se vende por debajo del costo' : ''">
              {{ marginText(p) }}<span v-if="isBelowCost(p)" class="below-tag">bajo costo</span>
            </td>
            <td class="ttax">{{ taxTreatmentLabel(p.taxTreatment) }}</td>
            <td class="tstock">{{ p.currentStock }} u</td>
            <td><StockStatePill :state="stockState(p)" /></td>
            <td class="texp">{{ formatExpire(p.expireDate) }}</td>
            <td class="tactions" @click.stop>
              <button v-if="canUpdate" type="button" class="restock" @click="restockFor = p">Reabastecer</button>
              <button v-if="canDelete" type="button" class="pause" title="Pausar" @click="pausing = p">
                <PauseCircle :size="15" :stroke-width="1.7" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="pageCount > 1" class="pag">
        <span>{{ filtered.length }} productos · página {{ page }} de {{ pageCount }}</span>
        <div class="pag-ctrl">
          <button type="button" :disabled="page === 1" @click="page--"><ChevronLeft :size="14" /></button>
          <button type="button" :disabled="page === pageCount" @click="page++"><ChevronRight :size="14" /></button>
        </div>
      </div>
    </template>

    <!-- ─────────── Modo PAUSADOS ─────────── -->
    <template v-else>
      <p class="paused-hint">Productos pausados (ocultos del punto de venta). Reactívalos para volverlos a vender.</p>
      <table class="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th>SKU</th>
            <th>Precio venta</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pausedLoading">
            <td colspan="6" class="empty">Cargando…</td>
          </tr>
          <tr v-else-if="store.pausedProducts.value.length === 0">
            <td colspan="6" class="empty">No hay productos pausados.</td>
          </tr>
          <tr v-for="p in store.pausedProducts.value" v-else :key="p.id">
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
            <td class="tstock">{{ p.currentStock }} u</td>
            <td class="tactions">
              <button v-if="canDelete" type="button" class="reactivate" @click="onReactivate(p)">
                <RotateCcw :size="14" :stroke-width="1.7" /> Reactivar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <ProductFormModal :open="modalOpen || editing !== null" :initial="editing" @close="onFormClose" @saved="onSaved" />
    <RestockModal :open="restockFor !== null" :product="restockFor" @close="restockFor = null" @confirm="onRestock" />
    <CategoryManagerModal
      :open="categoriesOpen"
      title="Categorías de producto"
      :categories="store.productCategories.value"
      :counts="categoryCounts"
      :can-create="canCatCreate"
      :can-update="canCatUpdate"
      :can-delete="canCatDelete"
      @close="categoriesOpen = false"
      @upsert="onCategoryUpsert"
      @remove="onCategoryRemove"
    />
    <ConfirmDeleteDialog
      :open="pausing !== null"
      title="Pausar producto"
      action-label="Pausar"
      :message="pausing ? `${pausing.name} dejará de aparecer en el punto de venta. Podrás reactivarlo desde la pestaña “Pausados” cuando quieras.` : ''"
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
.inv { font-family: var(--font-sans); color: var(--warm-900); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; color: var(--warm-900); }
.head-actions { display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
.seg { display: inline-flex; background: var(--warm-100); border: 1px solid var(--warm-200); border-radius: 9px; padding: 2px; }
.seg button { border: none; background: transparent; font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--warm-600); padding: 6px 12px; border-radius: 7px; cursor: pointer; }
.seg button.on { background: var(--warm-50); color: var(--amatista-700); box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08); }
.cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: 9px;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: #fff; border: none; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.45);
}
.ghost-cta {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 9px;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
}
.ghost-cta:hover { background: var(--warm-100); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.alert {
  display: flex; align-items: center; gap: 9px; padding: 11px 14px; margin-bottom: 16px;
  background: oklch(96% 0.04 80); border: 1px solid oklch(88% 0.08 80); border-radius: 10px;
  font-size: 13px; color: oklch(40% 0.10 70); cursor: pointer;
}
.alert:hover { background: oklch(94% 0.05 80); }
.alert strong { color: oklch(35% 0.13 70); }
.paused-hint { margin: 0 0 14px; font-size: 12.5px; color: var(--warm-500); }
.filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 9px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 10px 13px; max-width: 340px; flex: 1; }
.search:focus-within { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.s-icon { color: var(--warm-500); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--warm-900); min-width: 0; }
.fsel {
  appearance: none; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 9px;
  padding: 10px 30px 10px 14px; font-family: inherit; font-size: 13.5px; color: var(--warm-800); cursor: pointer;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%23999' stroke-width='1.5' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 11px center;
}
.fsel:focus { outline: none; border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.table { width: 100%; border-collapse: collapse; font-size: 13px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; overflow: hidden; }
.table th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--warm-500); font-weight: 600; padding: 11px 14px; background: var(--warm-100); border-bottom: 1px solid var(--warm-200); }
.table td { padding: 11px 14px; border-bottom: 1px solid var(--warm-150); color: var(--warm-800); vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.trow { cursor: pointer; }
.trow:hover { background: var(--warm-100); }
.empty { text-align: center; padding: 40px; color: var(--warm-500); }
.tname { font-weight: 500; color: var(--warm-900); }
.tsku { font-family: var(--font-mono); font-size: 12px; color: var(--warm-600); }
.tstock { font-weight: 600; }
.ttax { color: var(--warm-600); font-size: 12.5px; }
.texp { color: var(--warm-600); }
.tmargin { font-weight: 600; color: var(--warm-700); white-space: nowrap; }
.tmargin.below { color: oklch(50% 0.18 25); }
.below-tag { display: inline-block; margin-left: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; color: oklch(45% 0.18 25); background: oklch(95% 0.06 25); border-radius: 5px; padding: 1px 5px; }
.catpill { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; background: var(--warm-150); color: var(--warm-700); }
.tactions { display: flex; gap: 6px; align-items: center; }
.restock { padding: 5px 11px; border-radius: 7px; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.restock:hover { background: var(--amatista-50); border-color: var(--amatista-300); color: var(--amatista-700); }
.pause { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-600); cursor: pointer; }
.pause:hover { background: oklch(96% 0.04 80); color: oklch(45% 0.12 70); border-color: oklch(88% 0.08 80); }
.reactivate { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--amatista-200); background: var(--amatista-50); color: var(--amatista-700); font-family: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.reactivate:hover { background: var(--amatista-100); }
.pag { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; font-size: 12.5px; color: var(--warm-500); }
.pag-ctrl { display: flex; gap: 6px; }
.pag-ctrl button { width: 30px; height: 30px; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 7px; color: var(--warm-700); cursor: pointer; display: grid; place-items: center; }
.pag-ctrl button:disabled { opacity: 0.4; cursor: not-allowed; }
.pag-ctrl button:hover:not(:disabled) { background: var(--warm-100); }

@media (max-width: 760px) {
  .head {
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions,
  .filters {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .seg,
  .ghost-cta,
  .cta,
  .search,
  .fsel {
    width: 100%;
    max-width: none;
  }

  .seg button,
  .ghost-cta,
  .cta {
    justify-content: center;
  }

  .table {
    display: block;
    overflow-x: auto;
  }
}
</style>

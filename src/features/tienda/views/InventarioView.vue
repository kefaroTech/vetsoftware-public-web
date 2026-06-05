<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bell, ChevronLeft, ChevronRight, Package, Plus, Search } from 'lucide-vue-next'
import StockStatePill from '../components/StockStatePill.vue'
import ProductFormModal from '../components/ProductFormModal.vue'
import RestockModal from '../components/RestockModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney, stockState } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ProductPayload, ProductResponse, StockState } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.PRODUCT_CREATE)
const canUpdate = can(PERMISSIONS.PRODUCT_UPDATE)

const query = ref('')
const cat = ref('')
const stState = ref<'' | StockState>('')
const page = ref(1)
const PAGE_SIZE = 10

const modalOpen = ref(false)
const editing = ref<ProductResponse | null>(null)
const restockFor = ref<ProductResponse | null>(null)
const categoriesOpen = ref(false)

onMounted(() => store.ensureLoaded())

const lowCount = computed(() => store.products.value.filter((p) => stockState(p) !== 'OK').length)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.products.value.filter((p) => {
    if (cat.value && String(p.productCategory.id) !== cat.value) return false
    if (stState.value && stockState(p) !== stState.value) return false
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

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onRowClick(item: ProductResponse) {
  editing.value = item
}
function onSaved(item: ProductResponse) {
  const wasEdit = editing.value !== null
  toast.success('Producto guardado', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió al inventario.`)
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
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
    hasTax: p.hasTax,
    expireDate: p.expireDate,
    notes: p.notes,
    productCategoryId: p.productCategory.id,
    taxId: p.tax?.id ?? null,
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
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo reabastecer'))
  }
}

async function onCategoryUpsert(p: { id: number | null; name: string; description: string }) {
  try {
    if (p.id) await store.updateProductCategory(p.id, p.name, p.description)
    else await store.createProductCategory(p.name, p.description)
    toast.success('Categoría guardada')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo guardar la categoría'))
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
        <button type="button" class="ghost-cta" @click="categoriesOpen = true">
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button v-if="canCreate" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nuevo producto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div v-if="lowCount > 0" class="alert">
      <Bell :size="15" :stroke-width="1.8" />
      <span><strong>{{ lowCount }}</strong> producto(s) con stock bajo o agotado</span>
    </div>

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
          <th>Stock</th>
          <th>Estado</th>
          <th>Vence</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="store.loading.value">
          <td colspan="8" class="empty">Cargando…</td>
        </tr>
        <tr v-else-if="slice.length === 0">
          <td colspan="8" class="empty">Sin productos para el filtro.</td>
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
          <td class="tstock">{{ p.currentStock }} u</td>
          <td><StockStatePill :state="stockState(p)" /></td>
          <td class="texp">{{ p.expireDate ? 'Sí' : '—' }}</td>
          <td @click.stop>
            <button v-if="canUpdate" type="button" class="restock" @click="restockFor = p">Reabastecer</button>
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

    <ProductFormModal :open="modalOpen || editing !== null" :initial="editing" @close="onFormClose" @saved="onSaved" />
    <RestockModal :open="restockFor !== null" :product="restockFor" @close="restockFor = null" @confirm="onRestock" />
    <CategoryManagerModal
      :open="categoriesOpen"
      title="Categorías de producto"
      :categories="store.productCategories.value"
      :counts="categoryCounts"
      @close="categoriesOpen = false"
      @upsert="onCategoryUpsert"
      @remove="onCategoryRemove"
    />
  </div>
</template>

<style scoped>
.inv { font-family: var(--font-sans); color: var(--warm-900); }
.head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.kicker { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--warm-500); font-weight: 500; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 36px; font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; color: var(--warm-900); }
.head-actions { display: flex; gap: 8px; flex-shrink: 0; }
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
  font-size: 13px; color: oklch(40% 0.10 70);
}
.alert strong { color: oklch(35% 0.13 70); }
.filters { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 9px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 10px 13px; max-width: 340px; flex: 1; }
.search:focus-within { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.s-icon { color: var(--warm-500); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--warm-900); min-width: 0; }
.fsel {
  appearance: none; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 9px;
  padding: 9px 30px 9px 12px; font-family: inherit; font-size: 13px; color: var(--warm-800); cursor: pointer;
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
.texp { color: var(--warm-600); }
.catpill { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; background: var(--warm-150); color: var(--warm-700); }
.restock { padding: 5px 11px; border-radius: 7px; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.restock:hover { background: var(--amatista-50); border-color: var(--amatista-300); color: var(--amatista-700); }
.pag { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; font-size: 12.5px; color: var(--warm-500); }
.pag-ctrl { display: flex; gap: 6px; }
.pag-ctrl button { width: 30px; height: 30px; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 7px; color: var(--warm-700); cursor: pointer; display: grid; place-items: center; }
.pag-ctrl button:disabled { opacity: 0.4; cursor: not-allowed; }
.pag-ctrl button:hover:not(:disabled) { background: var(--warm-100); }
</style>

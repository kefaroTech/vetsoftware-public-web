<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Pencil, Plus, Tag, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import ListBody from '@/features/acciones/components/ListBody.vue'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import StockStatePill from '../components/StockStatePill.vue'
import ProductFormModal from '../components/ProductFormModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import { useTienda } from '../composables/useTienda'
import { formatMoney, stockState } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ProductResponse } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.PRODUCT_CREATE)
const canUpdate = can(PERMISSIONS.PRODUCT_UPDATE)
const canDelete = can(PERMISSIONS.PRODUCT_DELETE)

const modalOpen = ref(false)
const editing = ref<ProductResponse | null>(null)
const deleting = ref<ProductResponse | null>(null)
const deletingBusy = ref(false)
const categoriesOpen = ref(false)

onMounted(() => store.ensureLoaded())

const lowStock = computed(() => store.products.value.filter((p) => stockState(p) !== 'OK'))

const categoryCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {}
  for (const p of store.products.value) {
    counts[p.productCategory.id] = (counts[p.productCategory.id] ?? 0) + 1
  }
  return counts
})

function searchFn(item: ProductResponse, q: string) {
  return (
    item.name.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    item.productCategory.name.toLowerCase().includes(q)
  )
}

function openNew() {
  editing.value = null
  modalOpen.value = true
}
function onSaved(item: ProductResponse) {
  const wasEdit = editing.value !== null
  toast.success('Producto guardado', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió al inventario.`)
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

async function onConfirmDelete() {
  const target = deleting.value
  if (!target) return
  deletingBusy.value = true
  try {
    await store.removeProduct(target.id)
    toast.info('Producto eliminado', 'El producto fue removido del inventario.')
    deleting.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo eliminar'))
  } finally {
    deletingBusy.value = false
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
  <div class="page">
    <PageHeader
      kicker="Tienda"
      title="Inventario"
      lead="Productos con stock, precios y alertas de reabastecimiento."
    >
      <template #action>
        <div class="head-actions">
          <button type="button" class="ghost-cta" @click="categoriesOpen = true">
            <Tag :size="15" :stroke-width="1.8" /> Categorías
          </button>
          <button v-if="canCreate" type="button" class="cta" @click="openNew">
            <Plus :size="16" :stroke-width="1.8" /> Nuevo producto
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div v-if="lowStock.length > 0" class="banner warn">
      <AlertTriangle :size="15" :stroke-width="1.8" />
      <span>{{ lowStock.length }} producto(s) con stock bajo o agotado.</span>
    </div>

    <ListBody
      :items="store.products.value"
      :loading="store.loading.value"
      :search-fn="searchFn"
      placeholder="Buscar por nombre, código o categoría…"
      empty-text="Aún no hay productos en el inventario."
    >
      <template #header>
        <tr>
          <th>Producto</th>
          <th>Código</th>
          <th>Categoría</th>
          <th>Precio venta</th>
          <th>Stock</th>
          <th>Estado</th>
          <th v-if="canUpdate || canDelete" class="actions-col">Acciones</th>
        </tr>
      </template>
      <template #row="{ item }">
        <tr>
          <td>{{ item.name }}</td>
          <td class="mono">{{ item.code }}</td>
          <td>{{ item.productCategory.name }}</td>
          <td>{{ formatMoney(item.salePrice) }}</td>
          <td>{{ item.currentStock }} / mín {{ item.minStock }}</td>
          <td><StockStatePill :state="stockState(item)" /></td>
          <td v-if="canUpdate || canDelete" class="actions">
            <button v-if="canUpdate" type="button" class="icon-btn" title="Editar" @click="editing = item">
              <Pencil :size="15" :stroke-width="1.7" />
            </button>
            <button v-if="canDelete" type="button" class="icon-btn danger" title="Eliminar" @click="deleting = item">
              <Trash2 :size="15" :stroke-width="1.7" />
            </button>
          </td>
        </tr>
      </template>
    </ListBody>

    <ProductFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <CategoryManagerModal
      :open="categoriesOpen"
      title="Categorías de producto"
      :categories="store.productCategories.value"
      :counts="categoryCounts"
      @close="categoriesOpen = false"
      @upsert="onCategoryUpsert"
      @remove="onCategoryRemove"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar producto"
      :message="deleting ? `Se eliminará ${deleting.name}. Esta acción no se puede deshacer.` : ''"
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.head-actions { display: flex; gap: 10px; align-items: center; }
.cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit; white-space: nowrap;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
}
.ghost-cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px; font-size: 13.5px; font-weight: 500;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); border-radius: 9px; cursor: pointer; font-family: inherit; white-space: nowrap;
}
.ghost-cta:hover { background: var(--warm-100); }
.banner { display: flex; align-items: center; gap: 8px; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); }
.banner.warn { background: oklch(95% 0.07 80); border: 1px solid oklch(85% 0.10 80); color: oklch(40% 0.13 70); }
.mono { font-family: var(--font-mono); font-size: 12px; }
.actions-col { width: 88px; text-align: right; }
.actions { display: flex; gap: 6px; justify-content: flex-end; }
.icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px;
  border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer;
}
.icon-btn:hover { background: var(--warm-100); }
.icon-btn.danger:hover { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
</style>

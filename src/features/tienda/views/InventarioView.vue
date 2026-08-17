<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BookText, ClipboardList, Package, Plus } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import ProductFormModal from '../components/ProductFormModal.vue'
import RestockModal from '../components/RestockModal.vue'
import AdjustModal from '../components/AdjustModal.vue'
import TransferModal from '../components/TransferModal.vue'
import ConsumeModal from '../components/ConsumeModal.vue'
import StockDetailModal from '../components/StockDetailModal.vue'
import PurchasesModal from '../components/PurchasesModal.vue'
import CountSheetModal from '../components/CountSheetModal.vue'
import CountsHistoryModal from '../components/CountsHistoryModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import InventoryAlerts from '../components/InventoryAlerts.vue'
import InventoryProductsTable from '../components/InventoryProductsTable.vue'
import InventoryPausedTable from '../components/InventoryPausedTable.vue'
import FilterSelect from '../components/FilterSelect.vue'
import SegTabs from '../components/SegTabs.vue'
import { useTienda } from '../composables/useTienda'
import { useInventoryActions } from '../composables/useInventoryActions'
import { useBranches } from '@/features/branches/composables/useBranches'
import { stockOf } from '../composables/pricing'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { getProblemDetailMessage } from '@/services/http/http.client'
import type { ProductResponse, StockState } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const branches = useBranches()
const { can, canAny } = useAuthorization()
const canCreate = can(PERMISSIONS.PRODUCT_CREATE)
const canUpdate = can(PERMISSIONS.PRODUCT_UPDATE)
const canDelete = can(PERMISSIONS.PRODUCT_DELETE)
const canReadStock = can(PERMISSIONS.INVENTORY_READ)
const canAdjust = can(PERMISSIONS.INVENTORY_ADJUST)
const canTransfer = can(PERMISSIONS.INVENTORY_TRANSFER)
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

const modalOpen = ref(false)
const editing = ref<ProductResponse | null>(null)
const detailFor = ref<ProductResponse | null>(null)
const purchasesOpen = ref(false)
const historyOpen = ref(false)
const categoriesOpen = ref(false)
const pausedLoading = ref(false)

/** Sede activa (del selector global). null = admin con "Todas" → el stock no se muestra (es por sede). */
const branchId = computed(() => branches.selectedBranchId.value)
const {
  restockFor,
  adjustFor,
  transferFor,
  consumeFor,
  countOpen,
  pausing,
  pausingBusy,
  onReceive,
  onAdjust,
  onTransfer,
  openCount,
  onRecordCount,
  onConsume,
  onMinStockCommit,
  onConfirmPause,
  onReactivate,
  onCategoryUpsert,
  onCategoryRemove,
} = useInventoryActions({
  branchId,
  branchName: computed(() => branchName.value),
  reloadStock: () => reloadStock(),
  minStockOf: (p) => stockOf(store.stockByProduct.value, p.id).minStock,
})

const branchName = computed(
  () => branches.visibleBranches.value.find((b) => b.id === branchId.value)?.name ?? '',
)
const hasBranch = computed(() => branchId.value != null)
/** Mostrar stock por sede: requiere sede activa Y permiso de lectura de inventario. */
const showStock = computed(() => hasBranch.value && canReadStock.value)

/** Sedes destino para transferir: las visibles menos la de origen. */
const transferBranchOptions = computed(() =>
  branches.visibleBranches.value
    .filter((b) => b.id !== branchId.value)
    .map((b) => ({ value: String(b.id), label: b.name })),
)

/** Saldo de un producto en la sede activa (para los modales que lo necesitan). */
function quantityOf(p: ProductResponse): number {
  return stockOf(store.stockByProduct.value, p.id).quantity
}

async function reloadStock() {
  // loadStock ya traga errores (incl. 403 sin permiso): deja el mapa vacío. Solo tiene sentido si puede leer.
  if (!canReadStock.value) return
  await store.loadStock(branchId.value)
  await store.loadInventoryInsights(branchId.value)
}

/** Lotes por vencer (≤30 días o vencidos) de la sede activa. */
const expiringLots = computed(() => (showStock.value ? (store.alerts.value?.expiring ?? []) : []))
const totalValue = computed(() => (showStock.value ? (store.valuation.value?.totalValue ?? 0) : 0))

onMounted(async () => {
  await store.reload()
  await reloadStock()
})
// Regla: recargar al cambiar de sede activa.
watch(branchId, () => reloadStock())

const lowCount = computed(() =>
  showStock.value
    ? store.products.value.filter((p) => stockOf(store.stockByProduct.value, p.id).lowStock).length
    : 0,
)

// La paginación vive en la tabla, pero el filtro que la alimenta vive aquí:
// al cambiarlo hay que volver a la primera página o se queda en una vacía.
watch([query, cat, stState], () => {
  page.value = 1
})

const categoryCounts = computed<Record<number, number>>(() => {
  const counts: Record<number, number> = {}
  for (const p of store.products.value)
    counts[p.productCategory.id] = (counts[p.productCategory.id] ?? 0) + 1
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
      toast.error(
        'Ocurrió un error',
        getProblemDetailMessage(e, 'No se pudieron cargar los pausados'),
      )
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
  if (canUpdate.value) editing.value = item
}
function onSaved(item: ProductResponse) {
  const wasEdit = editing.value !== null
  toast.success(
    'Producto guardado',
    wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió al catálogo.`,
  )
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}
</script>

<template>
  <div class="ds-page">
    <header class="ds-head">
      <div>
        <div class="ds-kicker ds-kicker--spaced">Tienda · Inventario</div>
        <h1 class="ds-display">Inventario por sede</h1>
      </div>
      <div class="head-actions ds-flex-row">
        <FilterSelect
          v-if="branches.hasBranches.value"
          v-model="branches.selectedValue.value"
          class="branch"
        >
          <option v-for="o in branches.options.value" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </FilterSelect>
        <SegTabs
          :model-value="mode"
          :options="[
            { value: 'active', label: 'Activos' },
            { value: 'paused', label: 'Pausados' },
          ]"
          @update:model-value="switchMode"
        />
        <button
          v-if="showStock"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--nowrap"
          @click="purchasesOpen = true"
        >
          <BookText :size="14" :stroke-width="1.8" /> Compras
        </button>
        <button
          v-if="showStock && canAdjust"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--nowrap"
          @click="openCount"
        >
          <ClipboardList :size="14" :stroke-width="1.8" /> Conteo
        </button>
        <button
          v-if="canManageCategories"
          type="button"
          class="ds-btn ds-btn--ghost ds-btn--nowrap"
          @click="categoriesOpen = true"
        >
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button
          v-if="canCreate && mode === 'active'"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--elevated ds-btn--nowrap"
          @click="openNew"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nuevo producto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

    <InventoryAlerts
      v-if="mode === 'active'"
      :has-branch="hasBranch"
      :can-read-stock="canReadStock"
      :show-stock="showStock"
      :branch-name="branchName"
      :low-count="lowCount"
      :expiring-lots="expiringLots"
      :total-value="totalValue"
      @show-low-stock="showLowStock"
    />

    <InventoryProductsTable
      v-if="mode === 'active'"
      v-model:query="query"
      v-model:cat="cat"
      v-model:st-state="stState"
      v-model:page="page"
      :products="store.products.value"
      :categories="store.productCategories.value"
      :stock-by-product="store.stockByProduct.value"
      :loading="store.loading.value"
      :show-stock="showStock"
      :can-delete="canDelete"
      :can-adjust="canAdjust"
      :can-transfer="canTransfer"
      :has-transfer-targets="transferBranchOptions.length > 0"
      @row-click="onRowClick"
      @detail="detailFor = $event"
      @restock="restockFor = $event"
      @adjust="adjustFor = $event"
      @transfer="transferFor = $event"
      @consume="consumeFor = $event"
      @pause="pausing = $event"
      @min-stock-commit="onMinStockCommit"
    />

    <InventoryPausedTable
      v-else
      :products="store.pausedProducts.value"
      :loading="pausedLoading"
      :can-delete="canDelete"
      @reactivate="onReactivate"
    />

    <ProductFormModal
      :open="modalOpen || editing !== null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />
    <RestockModal
      :open="restockFor !== null"
      :product="restockFor"
      :branch-name="branchName"
      @close="restockFor = null"
      @confirm="onReceive"
    />
    <AdjustModal
      :open="adjustFor !== null"
      :product="adjustFor"
      :branch-name="branchName"
      :current="adjustFor ? quantityOf(adjustFor) : undefined"
      @close="adjustFor = null"
      @confirm="onAdjust"
    />
    <TransferModal
      :open="transferFor !== null"
      :product="transferFor"
      :from-branch-name="branchName"
      :current="transferFor ? quantityOf(transferFor) : undefined"
      :branch-options="transferBranchOptions"
      @close="transferFor = null"
      @confirm="onTransfer"
    />
    <ConsumeModal
      :open="consumeFor !== null"
      :product="consumeFor"
      :branch-name="branchName"
      :current="consumeFor ? quantityOf(consumeFor) : undefined"
      @close="consumeFor = null"
      @confirm="onConsume"
    />
    <StockDetailModal
      :open="detailFor !== null"
      :product="detailFor"
      :branch-id="branchId"
      :branch-name="branchName"
      @close="detailFor = null"
    />
    <PurchasesModal
      :open="purchasesOpen"
      :branch-id="branchId"
      :branch-name="branchName"
      @close="purchasesOpen = false"
    />
    <CountSheetModal
      :open="countOpen"
      :branch-name="branchName"
      :products="store.products.value"
      :categories="store.productCategories.value"
      :stock-by-product="store.stockByProduct.value"
      @close="countOpen = false"
      @confirm="onRecordCount"
      @history="historyOpen = true"
    />
    <CountsHistoryModal
      :open="historyOpen"
      :branch-id="branchId"
      :branch-name="branchName"
      :products="store.products.value"
      @close="historyOpen = false"
    />
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
      :message="
        pausing
          ? `${pausing.name} dejará de aparecer en el punto de venta. Podrás reactivarlo desde la pestaña “Pausados” cuando quieras.`
          : ''
      "
      :busy="pausingBusy"
      @cancel="pausing = null"
      @confirm="onConfirmPause"
    />
  </div>
</template>

<style scoped>
/* El contenedor usa `.ds-page` y la cabecera `.ds-head` (primitives.css).
   Los filtros, las tablas y los avisos se fueron con sus componentes; aquí solo
   queda el CSS de la cabecera. */

/* El rótulo en versalitas es `.ds-kicker ds-kicker--spaced` y la fila de la
   cabecera `.ds-flex-row` (primitives.css). */
.head-actions {
  flex-shrink: 0;
}

/* El selector de sede es un `FilterSelect` teñido: solo se queda el tinte, que
   es propio de esta vista.

   El `:focus` se repite aquí a propósito. `.fsel.branch` pesa lo mismo que el
   `:focus` del componente y el desempate lo decidiría el orden del bundle; con
   las dos reglas en este archivo, el borde de foco gana siempre por orden. */
.fsel.branch {
  color: var(--amatista-700);
  border-color: var(--amatista-200);
  background-color: var(--amatista-50);
  font-weight: 500;
}
.fsel:focus {
  border-color: var(--amatista-500);
}

@media (width <= 760px) {
  .ds-head {
    align-items: stretch;
    flex-direction: column;
  }
  .head-actions {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  /* Los antiguos `.cta`/`.ghost-cta` son ahora `.ds-btn`; todos viven dentro
     de `.head-actions`, así que el selector sigue acotado a ellos. `.seg` y
     `.fsel` son raíces de componente y conservan el `data-v` de esta vista. */
  .seg,
  .head-actions .ds-btn,
  .fsel {
    width: 100%;
    max-width: none;
  }
  .head-actions .ds-btn {
    justify-content: center;
  }
}
</style>

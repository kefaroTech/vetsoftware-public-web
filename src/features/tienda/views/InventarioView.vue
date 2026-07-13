<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, ArrowLeftRight, Bell, BookText, Boxes, ChevronLeft, ChevronRight, ClipboardList, PauseCircle, Package, Plus, RotateCcw, Search, SlidersHorizontal, Syringe } from 'lucide-vue-next'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import StockStatePill from '../components/StockStatePill.vue'
import ProductFormModal from '../components/ProductFormModal.vue'
import RestockModal, { type ReceiveDraft } from '../components/RestockModal.vue'
import AdjustModal, { type AdjustDraft } from '../components/AdjustModal.vue'
import TransferModal, { type TransferDraft } from '../components/TransferModal.vue'
import ConsumeModal, { type ConsumeDraft } from '../components/ConsumeModal.vue'
import StockDetailModal from '../components/StockDetailModal.vue'
import PurchasesModal from '../components/PurchasesModal.vue'
import CountSheetModal, { type CountDraft } from '../components/CountSheetModal.vue'
import CountsHistoryModal from '../components/CountsHistoryModal.vue'
import CategoryManagerModal from '../components/CategoryManagerModal.vue'
import { useTienda } from '../composables/useTienda'
import { useBranches } from '@/features/branches/composables/useBranches'
import { formatMoney, stockState, taxTreatmentLabel } from '../composables/pricing'
import { productCategoryTone } from '../composables/categoryTone'
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
const PAGE_SIZE = 10

const modalOpen = ref(false)
const editing = ref<ProductResponse | null>(null)
const restockFor = ref<ProductResponse | null>(null)
const adjustFor = ref<ProductResponse | null>(null)
const transferFor = ref<ProductResponse | null>(null)
const consumeFor = ref<ProductResponse | null>(null)
const detailFor = ref<ProductResponse | null>(null)
const purchasesOpen = ref(false)
const countOpen = ref(false)
const historyOpen = ref(false)
const categoriesOpen = ref(false)
const pausing = ref<ProductResponse | null>(null)
const pausingBusy = ref(false)
const pausedLoading = ref(false)

/** Sede activa (del selector global). null = admin con "Todas" → el stock no se muestra (es por sede). */
const branchId = computed(() => branches.selectedBranchId.value)
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

function stockOf(p: ProductResponse): { quantity: number; minStock: number; lowStock: boolean } {
  const row = store.stockByProduct.value[p.id]
  return { quantity: row?.quantity ?? 0, minStock: row?.minStock ?? 0, lowStock: row?.lowStock ?? false }
}
function stateOf(p: ProductResponse): StockState {
  const s = stockOf(p)
  return stockState(s.quantity, s.minStock)
}

async function reloadStock() {
  // loadStock ya traga errores (incl. 403 sin permiso): deja el mapa vacío. Solo tiene sentido si puede leer.
  if (!canReadStock.value) return
  await store.loadStock(branchId.value)
  await store.loadInventoryInsights(branchId.value)
}

/** Lotes por vencer (≤30 días o vencidos) de la sede activa. */
const expiringLots = computed(() => (showStock.value ? store.alerts.value?.expiring ?? [] : []))
const totalValue = computed(() => (showStock.value ? store.valuation.value?.totalValue ?? 0 : 0))

onMounted(async () => {
  await store.reload()
  await reloadStock()
})
// Regla: recargar al cambiar de sede activa.
watch(branchId, () => reloadStock())

const lowCount = computed(() =>
  showStock.value ? store.products.value.filter((p) => stockOf(p).lowStock).length : 0,
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return store.products.value.filter((p) => {
    if (cat.value && String(p.productCategory.id) !== cat.value) return false
    if (stState.value) {
      const s = stateOf(p)
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
  if (canUpdate.value) editing.value = item
}
function onSaved(item: ProductResponse) {
  const wasEdit = editing.value !== null
  toast.success('Producto guardado', wasEdit ? 'Los cambios se guardaron.' : `${item.name} se añadió al catálogo.`)
}
function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/** Entrada de mercancía (recepción) en la sede activa. */
async function onReceive(draft: ReceiveDraft) {
  const p = restockFor.value
  if (!p || branchId.value == null) return
  try {
    await store.receiveStock({
      branchId: branchId.value,
      productId: p.id,
      quantity: draft.quantity,
      unitCost: draft.unitCost,
      lotNumber: draft.lotNumber,
      expireDate: draft.expireDate,
    })
    toast.success('Entrada registrada', `Ingresaron ${draft.quantity} u. de ${p.name}.`)
    restockFor.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo registrar la entrada'))
  }
}

async function onAdjust(draft: AdjustDraft) {
  const p = adjustFor.value
  if (!p || branchId.value == null) return
  try {
    await store.adjustStock({
      branchId: branchId.value,
      productId: p.id,
      delta: draft.delta,
      unitCost: draft.unitCost,
      reason: draft.reason,
    })
    toast.success('Ajuste aplicado', `${p.name}: ${draft.delta > 0 ? '+' : ''}${draft.delta} u.`)
    adjustFor.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo aplicar el ajuste'))
  }
}

async function onTransfer(draft: TransferDraft) {
  const p = transferFor.value
  if (!p || branchId.value == null) return
  try {
    await store.transferStock({
      fromBranchId: branchId.value,
      toBranchId: draft.toBranchId,
      productId: p.id,
      quantity: draft.quantity,
      reason: draft.reason,
    })
    toast.success('Transferencia realizada', `${draft.quantity} u. de ${p.name} enviadas a otra sede.`)
    transferFor.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo transferir'))
  }
}

/** Abre la hoja de conteo con el stock de la sede recién recargado. */
async function openCount() {
  await reloadStock()
  countOpen.value = true
}

async function onRecordCount(draft: CountDraft) {
  if (branchId.value == null) return
  try {
    const view = await store.recordCount({ branchId: branchId.value, note: draft.note, lines: draft.lines })
    toast.success(
      'Conteo aplicado',
      view.adjustedLines > 0
        ? `${view.adjustedLines} ajuste(s) generado(s) en ${branchName.value}.`
        : `Todo cuadra en ${branchName.value}: sin ajustes.`,
    )
    countOpen.value = false
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo registrar el conteo'))
  }
}

async function onConsume(draft: ConsumeDraft) {
  const p = consumeFor.value
  if (!p || branchId.value == null) return
  try {
    await store.consumeStock({
      branchId: branchId.value,
      productId: p.id,
      quantity: draft.quantity,
      reason: draft.reason,
    })
    toast.success('Consumo registrado', `${draft.quantity} u. de ${p.name} aplicadas.`)
    consumeFor.value = null
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo registrar el consumo'))
  }
}

/** Fija el mínimo de la sede activa al perder foco. */
async function onMinStockCommit(p: ProductResponse, ev: Event) {
  if (branchId.value == null) return
  const value = Math.max(0, Math.floor(Number((ev.target as HTMLInputElement).value) || 0))
  const current = stockOf(p).minStock
  if (value === current) return
  try {
    await store.setMinStock(p.id, branchId.value, value)
    toast.success('Mínimo actualizado', `${p.name}: mínimo ${value} u.`)
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo fijar el mínimo'))
    await reloadStock()
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
        <h1 class="title">Inventario por sede</h1>
      </div>
      <div class="head-actions">
        <select v-if="branches.hasBranches.value" v-model="branches.selectedValue.value" class="fsel branch">
          <option v-for="o in branches.options.value" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
        <div class="seg" role="tablist">
          <button type="button" :class="{ on: mode === 'active' }" @click="switchMode('active')">Activos</button>
          <button type="button" :class="{ on: mode === 'paused' }" @click="switchMode('paused')">Pausados</button>
        </div>
        <button v-if="showStock" type="button" class="ghost-cta" @click="purchasesOpen = true">
          <BookText :size="14" :stroke-width="1.8" /> Compras
        </button>
        <button v-if="showStock && canAdjust" type="button" class="ghost-cta" @click="openCount">
          <ClipboardList :size="14" :stroke-width="1.8" /> Conteo
        </button>
        <button v-if="canManageCategories" type="button" class="ghost-cta" @click="categoriesOpen = true">
          <Package :size="14" :stroke-width="1.8" /> Categorías
        </button>
        <button v-if="canCreate && mode === 'active'" type="button" class="cta" @click="openNew">
          <Plus :size="16" :stroke-width="1.8" /> Nuevo producto
        </button>
      </div>
    </header>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div v-if="mode === 'active' && !hasBranch" class="alert info">
      Selecciona una sede para ver y gestionar su stock.
    </div>

    <div v-if="mode === 'active' && hasBranch && !canReadStock" class="alert info">
      No tienes permiso para ver el inventario. Pide a un administrador el permiso <strong>Ver inventario</strong>.
    </div>

    <div v-if="mode === 'active' && showStock && lowCount > 0" class="alert" role="button" tabindex="0" @click="showLowStock" @keyup.enter="showLowStock">
      <Bell :size="15" :stroke-width="1.8" />
      <span><strong>{{ lowCount }}</strong> producto(s) bajo el mínimo en {{ branchName }} — ver por reponer</span>
    </div>

    <div v-if="mode === 'active' && showStock && expiringLots.length > 0" class="alert expire">
      <AlertTriangle :size="15" :stroke-width="1.8" />
      <span><strong>{{ expiringLots.length }}</strong> lote(s) por vencer o vencidos en {{ branchName }}
        (más próximo: {{ expiringLots[0].productName }}, {{ expiringLots[0].daysToExpire < 0 ? 'vencido' : `${expiringLots[0].daysToExpire} día(s)` }})</span>
    </div>

    <div v-if="mode === 'active' && showStock" class="valuation">
      <span class="v-label">Valor del inventario en {{ branchName }}</span>
      <strong class="v-amount">{{ formatMoney(totalValue) }}</strong>
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
            <th>IVA</th>
            <th>Stock</th>
            <th>Mínimo</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="store.loading.value">
            <td colspan="9" class="empty">Cargando…</td>
          </tr>
          <tr v-else-if="slice.length === 0">
            <td colspan="9" class="empty">Sin productos para el filtro.</td>
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
            <td class="ttax">{{ taxTreatmentLabel(p.taxTreatment) }}</td>
            <td class="tstock">{{ showStock ? `${stockOf(p).quantity} u` : '—' }}</td>
            <td class="tmin" @click.stop>
              <input
                v-if="showStock && canAdjust"
                class="min-input"
                type="number"
                min="0"
                :value="stockOf(p).minStock"
                @change="onMinStockCommit(p, $event)"
              />
              <span v-else>{{ showStock ? stockOf(p).minStock : '—' }}</span>
            </td>
            <td><StockStatePill v-if="showStock" :state="stateOf(p)" /><span v-else class="muted">—</span></td>
            <td class="tactions" @click.stop>
              <button v-if="showStock" type="button" class="iconbtn" title="Ver lotes y kardex" @click="detailFor = p">
                <Boxes :size="15" :stroke-width="1.7" />
              </button>
              <button v-if="canAdjust && showStock" type="button" class="restock" @click="restockFor = p">Entrada</button>
              <button v-if="canAdjust && showStock" type="button" class="iconbtn" title="Ajustar" @click="adjustFor = p">
                <SlidersHorizontal :size="15" :stroke-width="1.7" />
              </button>
              <button v-if="canTransfer && showStock && transferBranchOptions.length > 0" type="button" class="iconbtn" title="Transferir" @click="transferFor = p">
                <ArrowLeftRight :size="15" :stroke-width="1.7" />
              </button>
              <button v-if="canAdjust && showStock" type="button" class="iconbtn" title="Consumo clínico" @click="consumeFor = p">
                <Syringe :size="15" :stroke-width="1.7" />
              </button>
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
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pausedLoading">
            <td colspan="5" class="empty">Cargando…</td>
          </tr>
          <tr v-else-if="store.pausedProducts.value.length === 0">
            <td colspan="5" class="empty">No hay productos pausados.</td>
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
    <RestockModal :open="restockFor !== null" :product="restockFor" :branch-name="branchName" @close="restockFor = null" @confirm="onReceive" />
    <AdjustModal :open="adjustFor !== null" :product="adjustFor" :branch-name="branchName" :current="adjustFor ? stockOf(adjustFor).quantity : undefined" @close="adjustFor = null" @confirm="onAdjust" />
    <TransferModal :open="transferFor !== null" :product="transferFor" :from-branch-name="branchName" :current="transferFor ? stockOf(transferFor).quantity : undefined" :branch-options="transferBranchOptions" @close="transferFor = null" @confirm="onTransfer" />
    <ConsumeModal :open="consumeFor !== null" :product="consumeFor" :branch-name="branchName" :current="consumeFor ? stockOf(consumeFor).quantity : undefined" @close="consumeFor = null" @confirm="onConsume" />
    <StockDetailModal :open="detailFor !== null" :product="detailFor" :branch-id="branchId" :branch-name="branchName" @close="detailFor = null" />
    <PurchasesModal :open="purchasesOpen" :branch-id="branchId" :branch-name="branchName" @close="purchasesOpen = false" />
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
.alert.info { background: var(--amatista-50); border-color: var(--amatista-200); color: var(--amatista-700); cursor: default; }
.alert.expire { background: oklch(95% 0.05 25); border-color: oklch(85% 0.12 25); color: oklch(45% 0.16 25); cursor: default; }
.alert.expire strong { color: oklch(40% 0.18 25); }
.alert strong { color: oklch(35% 0.13 70); }
.valuation { display: flex; align-items: baseline; gap: 10px; padding: 12px 16px; margin-bottom: 16px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px; }
.v-label { font-size: 12.5px; color: var(--warm-500); }
.v-amount { font-size: 20px; font-weight: 600; color: var(--amatista-700); font-variant-numeric: tabular-nums; }
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
.fsel.branch { color: var(--amatista-700); border-color: var(--amatista-200); background-color: var(--amatista-50); font-weight: 500; }
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
.muted { color: var(--warm-400); }
.min-input { width: 64px; border: 1px solid var(--warm-200); background: var(--warm-50); border-radius: 7px; padding: 5px 8px; font-family: inherit; font-size: 12.5px; color: var(--warm-800); }
.min-input:focus { outline: none; border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.catpill { display: inline-flex; padding: 2px 9px; border-radius: 999px; font-size: 11px; font-weight: 500; white-space: nowrap; background: var(--warm-150); color: var(--warm-700); }
.tactions { display: flex; gap: 6px; align-items: center; }
.restock { padding: 5px 11px; border-radius: 7px; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.restock:hover { background: var(--amatista-50); border-color: var(--amatista-300); color: var(--amatista-700); }
.iconbtn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-600); cursor: pointer; }
.iconbtn:hover { background: var(--amatista-50); border-color: var(--amatista-300); color: var(--amatista-700); }
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
  .head { align-items: stretch; flex-direction: column; }
  .head-actions, .filters { width: 100%; align-items: stretch; flex-direction: column; }
  .seg, .ghost-cta, .cta, .search, .fsel { width: 100%; max-width: none; }
  .seg button, .ghost-cta, .cta { justify-content: center; }
  .table { display: block; overflow-x: auto; }
}
</style>

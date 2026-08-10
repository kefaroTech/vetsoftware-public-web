<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, User } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosCashGate from '../components/PosCashGate.vue'
import PosCatalog, { type CatalogCard } from '../components/PosCatalog.vue'
import PosTicket from '../components/PosTicket.vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import FeCustomerPicker from '@/features/facturacion/components/FeCustomerPicker.vue'
import PayModal from '../components/PayModal.vue'
import ReceiptModal from '../components/ReceiptModal.vue'
import { useTienda } from '../composables/useTienda'
import { usePosSale } from '../composables/usePosSale'
import { useBranches } from '@/features/branches/composables/useBranches'
import { appliesIva, applyPromo, stockState } from '../composables/pricing'
import { productCategoryTone, serviceCategoryTone } from '../composables/categoryTone'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { companyTaxProfileApi } from '@/features/facturacion/api/companyTaxProfile.api'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { useCaja } from '@/features/caja/composables/useCaja'
import { useAuth } from '@/features/auth/composables/useAuth'
import { PERMISSIONS } from '@/constants/permissions'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'

const store = useTienda()
const router = useRouter()
const branches = useBranches()
const { can } = useFacturacionAccess()
const { subjectId } = useAuth()
const { openSessions, openSessionsLoading, openSessionsLoaded, loadOpenSessions } = useCaja()
const today = todayISO()
const cashCheckComplete = ref(false)
let posInitialized = false

const {
  lines,
  customer,
  payOpen,
  receiptOpen,
  receipt,
  grossSubtotal,
  promoSavings,
  taxRows,
  total,
  baseTotal,
  isEmpty,
  addToTicket,
  inc,
  dec,
  removeLine,
  confirmPay,
} = usePosSale()

const myOpenSession = computed(() =>
  subjectId.value == null
    ? null
    : (openSessions.value.find((session) => session.openedByEmployeeId === subjectId.value) ??
      null),
)
const cashBranchMismatch = computed(
  () =>
    myOpenSession.value != null && branches.selectedBranchId.value !== myOpenSession.value.branchId,
)
const posEnabled = computed(
  () =>
    cashCheckComplete.value &&
    openSessionsLoaded.value &&
    myOpenSession.value != null &&
    !cashBranchMismatch.value,
)

function cashBranchLabel(): string {
  const session = myOpenSession.value
  return (
    session?.branchName?.trim() || (session ? 'Sede #' + session.branchId : 'la sede de tu caja')
  )
}

function activatePos(): void {
  if (!posEnabled.value) return
  if (!posInitialized) {
    posInitialized = true
    store.reload()
    void checkTaxProfile()
  }
  void store.loadStock(branches.selectedBranchId.value)
}

async function checkCashAccess(): Promise<void> {
  cashCheckComplete.value = false
  await loadOpenSessions()
  cashCheckComplete.value = true
  activatePos()
}

function goToCash(): void {
  void router.push({
    name: 'caja',
    query: { openCash: '1', returnTo: 'tienda-pos' },
  })
}

function useMyCashBranch(): void {
  const session = myOpenSession.value
  if (!session) return
  branches.setSelectedBranch(session.branchId)
}

/** Stock del producto en la sede activa (informativo: el POS no bloquea la venta, solo avisa). */
function stockCountOf(productId: number): number | null {
  if (branches.selectedBranchId.value == null) return null
  return store.stockByProduct.value[productId]?.quantity ?? 0
}
function stockMinOf(productId: number): number {
  return store.stockByProduct.value[productId]?.minStock ?? 0
}

// Toda venta (tiquete POS o factura) lleva los datos fiscales del emisor, que salen del perfil fiscal de
// la empresa (CompanyTaxProfile). Sin él, el backend rechaza el registro: bloqueamos el cobro y guiamos a
// configurarlo en vez de dejar que falle con un error crudo.
const taxProfileMissing = ref(false)
const canConfigTaxProfile =
  can(PERMISSIONS.COMPANY_TAX_PROFILE_MANAGE) || can(PERMISSIONS.COMPANY_TAX_PROFILE_READ)

type Mode = 'producto' | 'servicio' | 'paquete'
const mode = ref<Mode>('producto')
const query = ref('')
const cat = ref<string>('')

const custOpen = ref(false)
// 'basic'  → asociar propietario opcional a la venta.
// 'fiscal' → seleccionar/crear el cliente a facturar (FE > 5 UVT): datos fiscales requeridos.
const custPurpose = ref<'basic' | 'fiscal'>('basic')

onMounted(() => void checkCashAccess())
// Regla: recargar el stock al cambiar la sede activa.
watch(posEnabled, (enabled) => {
  if (enabled) activatePos()
})
watch(
  () => branches.selectedBranchId.value,
  () => activatePos(),
)

// Se re-evalúa en cada montaje, así que volver del configurador refleja el perfil recién creado.
async function checkTaxProfile() {
  try {
    taxProfileMissing.value = (await companyTaxProfileApi.find()) === null
  } catch {
    // Ante un fallo transitorio no bloqueamos el POS; el cobro sigue protegido por el catch de confirmPay.
    taxProfileMissing.value = false
  }
}

function goToTaxProfile() {
  router.push({ name: 'facturacion-habilitacion' })
}

// Al cambiar de modo, limpia búsqueda y categoría.
watch(mode, () => {
  query.value = ''
  cat.value = ''
})

const categories = computed(() =>
  mode.value === 'producto'
    ? store.productCategories.value
    : mode.value === 'servicio'
      ? store.serviceCategories.value
      : [],
)

const catalog = computed<CatalogCard[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (mode.value === 'producto') {
    return store.products.value
      .filter((p) => !cat.value || String(p.productCategory.id) === cat.value)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .map((p) => {
        const stockCount = stockCountOf(p.id)
        const applied = applyPromo(
          p,
          'product',
          p.salePrice,
          p.productCategory.id,
          store.promotions.value,
          today,
        )
        return {
          id: p.id,
          name: p.name,
          basePrice: p.salePrice,
          price: applied.unitPrice,
          promoName: applied.promo?.name ?? null,
          taxTreatment: p.taxTreatment,
          taxPercentage: appliesIva(p.taxTreatment) ? (p.tax?.percentage ?? 0) : 0,
          taxName: p.tax?.name,
          stockState: stockCount == null ? null : stockState(stockCount, stockMinOf(p.id)),
          stockCount,
          isService: false,
          toneBg: productCategoryTone(p.productCategory).bg,
          toneFg: productCategoryTone(p.productCategory).fg,
        }
      })
  }
  if (mode.value === 'servicio') {
    return store.services.value
      .filter((s) => !cat.value || String(s.serviceCategory.id) === cat.value)
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((s) => {
        const applied = applyPromo(
          s,
          'service',
          s.price,
          s.serviceCategory.id,
          store.promotions.value,
          today,
        )
        return {
          id: s.id,
          name: s.name,
          basePrice: s.price,
          price: applied.unitPrice,
          promoName: applied.promo?.name ?? null,
          taxTreatment: s.taxTreatment,
          taxPercentage: appliesIva(s.taxTreatment) ? (s.tax?.percentage ?? 0) : 0,
          taxName: s.tax?.name,
          stockState: null,
          stockCount: null,
          isService: true,
          toneBg: serviceCategoryTone(s.serviceCategory).bg,
          toneFg: serviceCategoryTone(s.serviceCategory).fg,
        }
      })
  }
  // Paquetes: el backend aún no soporta bundles (ver gaps); tab vacío.
  return []
})

function onConfirmPay(method: string, received: number | null) {
  void confirmPay(method, received, taxProfileMissing.value)
}

function onPickCustomer(owner: OwnerResponse) {
  customer.value = owner
  custOpen.value = false
}
function toggleCustomer() {
  if (customer.value) {
    customer.value = null
  } else {
    custPurpose.value = 'basic'
    custOpen.value = true
  }
}
function openFiscalPicker() {
  custPurpose.value = 'fiscal'
  custOpen.value = true
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Tienda"
      title="Punto de venta"
      lead="Cobra productos y servicios. Cada venta genera su documento DIAN (o queda pendiente si no tienes el módulo)."
    />

    <PosCashGate
      v-if="!posEnabled"
      :checking="!cashCheckComplete || openSessionsLoading"
      :load-failed="cashCheckComplete && !openSessionsLoading && !openSessionsLoaded"
      :no-session="openSessionsLoaded && !myOpenSession"
      :branch-mismatch="!!myOpenSession && cashBranchMismatch"
      :cash-branch-label="cashBranchLabel()"
      :terminal="myOpenSession?.terminal"
      @retry="checkCashAccess"
      @go-to-cash="goToCash"
      @use-cash-branch="useMyCashBranch"
    />

    <template v-else>
      <div v-if="taxProfileMissing" class="banner warn">
        <AlertTriangle :size="18" class="warn-icon" />
        <div class="warn-text">
          <strong>Configura la identidad fiscal de tu empresa</strong>
          <span
            >Cada venta genera un documento (tiquete POS o factura) que debe llevar los datos
            fiscales del emisor. Sin el perfil fiscal no puedes registrar ventas.</span
          >
        </div>
        <button v-if="canConfigTaxProfile" type="button" class="warn-cta" @click="goToTaxProfile">
          Configurar
        </button>
        <span v-else class="warn-hint">Pídele a un administrador que la configure.</span>
      </div>

      <div v-if="store.error.value" class="ds-banner ds-banner--error">{{ store.error.value }}</div>

      <div class="pos">
        <PosCatalog
          :mode="mode"
          :query="query"
          :cat="cat"
          :categories="categories"
          :cards="catalog"
          @update:mode="mode = $event"
          @update:query="query = $event"
          @update:cat="cat = $event"
          @add="addToTicket"
        />

        <PosTicket
          :lines="lines"
          :customer="customer"
          :gross-subtotal="grossSubtotal"
          :promo-savings="promoSavings"
          :base-total="baseTotal"
          :tax-rows="taxRows"
          :total="total"
          :charge-disabled="isEmpty || taxProfileMissing"
          @toggle-customer="toggleCustomer"
          @inc="inc"
          @dec="dec"
          @remove="removeLine"
          @charge="payOpen = true"
        />
      </div>

      <ModalShell
        :open="custOpen"
        :title="custPurpose === 'fiscal' ? 'Cliente a facturar' : 'Asociar propietario'"
        :subtitle="
          custPurpose === 'fiscal'
            ? 'La factura electrónica irá a su nombre'
            : 'Vincula la venta a un cliente (opcional)'
        "
        :icon="User"
        :width="custPurpose === 'fiscal' ? 640 : 560"
        :elevated="payOpen"
        @close="custOpen = false"
      >
        <template #body>
          <FeCustomerPicker :mode="custPurpose" @pick="onPickCustomer" />
        </template>
      </ModalShell>

      <PayModal
        :open="payOpen"
        :total="total"
        :customer="customer"
        @close="payOpen = false"
        @confirm="onConfirmPay"
        @select-customer="openFiscalPicker"
        @customer-updated="(o) => (customer = o)"
      />
      <ReceiptModal
        v-if="receipt"
        :open="receiptOpen"
        :lines="receipt.lines"
        :totals="receipt.totals"
        :method="receipt.method"
        :change="receipt.change"
        :document="receipt.document"
        @close="receiptOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
/* El contenedor usa `.ds-page` (primitives.css). El bloqueo por caja y el ticket
   se fueron a `PosCashGate` y `PosTicket` con su CSS. */

/* El banner de error usa `.ds-banner--error` (primitives.css). El de aviso
   tiene tonos propios (hue 85/70) y se mantiene local. */
.banner.warn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: oklch(97% 0.05 85deg);
  border: 1px solid oklch(85% 0.11 85deg);
  color: oklch(40% 0.09 70deg);
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 14px;
}

.banner.warn .warn-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: oklch(60% 0.15 70deg);
}

.banner.warn .warn-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 13px;
  min-width: 0;
}

.banner.warn .warn-text strong {
  font-weight: 600;
}

.banner.warn .warn-text span {
  color: oklch(45% 0.05 70deg);
}

.banner.warn .warn-cta {
  flex: 0 0 auto;
  margin-left: auto;
  align-self: center;
  border: 1px solid oklch(60% 0.15 70deg);
  background: oklch(99% 0.02 85deg);
  color: oklch(40% 0.12 70deg);
  border-radius: 7px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.banner.warn .warn-cta:hover {
  background: oklch(95% 0.06 85deg);
}

.banner.warn .warn-hint {
  flex: 0 0 auto;
  margin-left: auto;
  align-self: center;
  font-size: 12.5px;
  color: oklch(50% 0.05 70deg);
}

.pos {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 18px;
  align-items: start;
}

@media (width <= 1100px) {
  .pos {
    grid-template-columns: 1fr 340px;
  }
}

@media (width <= 900px) {
  .pos {
    grid-template-columns: 1fr;
  }
}
</style>

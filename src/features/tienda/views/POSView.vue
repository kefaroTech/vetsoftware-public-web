<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  Minus,
  Package,
  Plus,
  Receipt,
  Search,
  Stethoscope,
  Trash2,
  User,
  X,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import OwnerPicker from '@/features/cuentas/components/OwnerPicker.vue'
import PayModal from '../components/PayModal.vue'
import ReceiptModal from '../components/ReceiptModal.vue'
import { useTienda } from '../composables/useTienda'
import { appliesIva, applyPromo, formatMoney, splitGross, stockState } from '../composables/pricing'
import { productCategoryTone, serviceCategoryTone } from '../composables/categoryTone'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { useToast } from '@/composables/useToast'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { posSaleApi, type PosSaleLineKind } from '../api/posSale.api'
import { companyTaxProfileApi } from '@/features/facturacion/api/companyTaxProfile.api'
import { useFacturacionAccess } from '@/features/facturacion/composables/useFacturacionAccess'
import { PERMISSIONS } from '@/constants/permissions'
import type { TotalsBreakdown } from '../composables/pricing'
import type { SaleLine, StockState, TaxTreatment } from '../types/tienda'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type { ElectronicDocumentResponse, PaymentMeans } from '@/features/facturacion/types/facturacion'

const store = useTienda()
const toast = useToast()
const router = useRouter()
const { can } = useFacturacionAccess()
const today = todayISO()

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
const lines = ref<SaleLine[]>([])

const customer = ref<OwnerResponse | null>(null)
const custOpen = ref(false)
const payOpen = ref(false)
const paying = ref(false)
const receiptOpen = ref(false)
const receipt = ref<{
  lines: SaleLine[]
  totals: TotalsBreakdown
  method: string
  change: number | null
  document: ElectronicDocumentResponse | null
} | null>(null)

// Método de pago del POS → medio de pago DIAN.
const MEANS_BY_METHOD: Record<string, PaymentMeans> = {
  EFECTIVO: 'EFECTIVO',
  TARJETA: 'TARJETA_CREDITO',
  TRANSFERENCIA: 'TRANSFERENCIA',
}

onMounted(() => {
  store.ensureLoaded()
  void checkTaxProfile()
})

// Se re-evalúa en cada montaje, así que volver del configurador refleja el perfil recién creado.
async function checkTaxProfile() {
  try {
    taxProfileMissing.value = (await companyTaxProfileApi.find()) === null
  } catch {
    // Ante un fallo transitorio no bloqueamos el POS; el cobro sigue protegido por el catch de onConfirmPay.
    taxProfileMissing.value = false
  }
}

function goToTaxProfile() {
  router.push({ name: 'facturacion-configuracion' })
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

interface CatalogCard {
  id: number
  name: string
  basePrice: number
  price: number
  promoName: string | null
  taxTreatment: TaxTreatment
  taxPercentage: number
  taxName?: string
  stockState: StockState | null
  stockCount: number | null
  isService: boolean
  toneBg: string
  toneFg: string
}

const catalog = computed<CatalogCard[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (mode.value === 'producto') {
    return store.products.value
      .filter((p) => (!cat.value || String(p.productCategory.id) === cat.value))
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .map((p) => {
        const applied = applyPromo(p, 'product', p.salePrice, p.productCategory.id, store.promotions.value, today)
        return {
          id: p.id, name: p.name, basePrice: p.salePrice, price: applied.unitPrice,
          promoName: applied.promo?.name ?? null,
          taxTreatment: p.taxTreatment,
          taxPercentage: appliesIva(p.taxTreatment) ? p.tax?.percentage ?? 0 : 0,
          taxName: p.tax?.name,
          stockState: stockState(p), stockCount: p.currentStock, isService: false,
          toneBg: productCategoryTone(p.productCategory).bg,
          toneFg: productCategoryTone(p.productCategory).fg,
        }
      })
  }
  if (mode.value === 'servicio') {
    return store.services.value
      .filter((s) => (!cat.value || String(s.serviceCategory.id) === cat.value))
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((s) => {
        const applied = applyPromo(s, 'service', s.price, s.serviceCategory.id, store.promotions.value, today)
        return {
          id: s.id, name: s.name, basePrice: s.price, price: applied.unitPrice,
          promoName: applied.promo?.name ?? null,
          taxTreatment: s.taxTreatment,
          taxPercentage: appliesIva(s.taxTreatment) ? s.tax?.percentage ?? 0 : 0,
          taxName: s.tax?.name,
          stockState: null, stockCount: null, isService: true,
          toneBg: serviceCategoryTone(s.serviceCategory).bg,
          toneFg: serviceCategoryTone(s.serviceCategory).fg,
        }
      })
  }
  // Paquetes: el backend aún no soporta bundles (ver gaps); tab vacío.
  return []
})

function addToTicket(card: CatalogCard) {
  if (card.stockState === 'AGOTADO') return
  const kind = card.isService ? 'service' : 'product'
  const existing = lines.value.find((l) => l.kind === kind && l.id === card.id)
  if (existing) {
    if (!card.isService && card.stockCount != null && existing.qty >= card.stockCount) {
      toast.warn('Sin stock', `Solo quedan ${card.stockCount} u.`)
      return
    }
    existing.qty += 1
    return
  }
  lines.value.push({
    kind, id: card.id, name: card.name, unitPrice: card.price, qty: 1,
    taxTreatment: card.taxTreatment, taxPercentage: card.taxPercentage, taxName: card.taxName,
    promoName: card.promoName ?? undefined,
    originalUnitPrice: card.promoName ? card.basePrice : undefined,
  })
}

function inc(line: SaleLine) {
  if (line.kind === 'product') {
    const p = store.products.value.find((x) => x.id === line.id)
    if (p && line.qty >= p.currentStock) {
      toast.warn('Sin stock', `Solo quedan ${p.currentStock} u.`)
      return
    }
  }
  line.qty += 1
}
function dec(line: SaleLine) {
  line.qty -= 1
  if (line.qty <= 0) removeLine(line)
}
function removeLine(line: SaleLine) {
  lines.value = lines.value.filter((l) => !(l.kind === line.kind && l.id === line.id))
}

// Subtotal BRUTO (IVA incluido), tras promo. No hay descuento manual: el servidor valida cada unitPrice
// contra el catálogo (precio de lista + promoción activa), así que solo las promociones reducen el precio.
const grossSubtotal = computed(() => lines.value.reduce((a, l) => a + l.unitPrice * l.qty, 0))
const promoSavings = computed(() =>
  lines.value.reduce(
    (a, l) => a + (l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice ? (l.originalUnitPrice - l.unitPrice) * l.qty : 0),
    0,
  ),
)

// IVA contenido por tasa, EXTRAÍDO del bruto.
const taxByRate = computed(() => {
  const groups = new Map<string, { name: string; amount: number }>()
  for (const l of lines.value) {
    const aplicaIva = appliesIva(l.taxTreatment)
    if (!aplicaIva || l.taxPercentage <= 0) continue
    const key = l.taxName ?? `IVA ${l.taxPercentage}%`
    const lineGross = l.unitPrice * l.qty
    const amount = splitGross(lineGross, aplicaIva, l.taxPercentage).tax
    const g = groups.get(key) ?? { name: key, amount: 0 }
    g.amount += amount
    groups.set(key, g)
  }
  return Array.from(groups.values()).filter((g) => g.amount > 0)
})
const taxTotal = computed(() => taxByRate.value.reduce((a, g) => a + g.amount, 0))
const total = computed(() => grossSubtotal.value)
const baseTotal = computed(() => grossSubtotal.value - taxTotal.value)
const isEmpty = computed(() => lines.value.length === 0)

async function onConfirmPay(method: string, received: number | null) {
  if (paying.value || taxProfileMissing.value) return
  const totalNow = total.value
  const totals: TotalsBreakdown = {
    net: baseTotal.value,
    tax: taxTotal.value,
    total: totalNow,
    promoSavings: promoSavings.value,
  }
  // Cada unitPrice ya viene con la promoción aplicada (entero) por applyPromo; se manda tal cual. El
  // servidor lo valida contra el catálogo (lista + promo) y extrae base/IVA.
  const saleLines = lines.value.map((l) => ({
    kind: (l.kind === 'service' ? 'SERVICE' : 'PRODUCT') as PosSaleLineKind,
    refId: l.id,
    quantity: l.qty,
    unitPrice: l.unitPrice,
  }))
  const snapshot = lines.value.map((l) => ({ ...l }))

  paying.value = true
  try {
    const document = await posSaleApi.register({
      documentType: 'DOC_EQUIV_POS',
      finalConsumer: !customer.value,
      customerOwnerId: customer.value?.id ?? null,
      lines: saleLines,
      payments: [{ means: MEANS_BY_METHOD[method] ?? 'EFECTIVO', amount: totalNow }],
    })
    receipt.value = {
      lines: snapshot,
      totals,
      method,
      change: received != null ? Math.max(0, received - totalNow) : null,
      document,
    }
    payOpen.value = false
    receiptOpen.value = true
    lines.value = []
    customer.value = null
    if (document.dianStatus === 'VALIDADO') {
      toast.success('Venta registrada', 'Factura validada por la DIAN.')
    } else if (document.dianStatus === 'PENDIENTE') {
      toast.success('Venta registrada', 'Documento guardado · emisión a la DIAN pendiente.')
    } else {
      toast.success('Venta registrada', 'Documento generado.')
    }
  } catch (e) {
    // Se mantiene el ticket y el modal de cobro abiertos para reintentar.
    toast.error('No se pudo registrar la venta', getProblemDetailMessage(e))
  } finally {
    paying.value = false
  }
}

function onSelectCustomer(owner: OwnerResponse) {
  customer.value = owner
  custOpen.value = false
}
function toggleCustomer() {
  if (customer.value) customer.value = null
  else custOpen.value = true
}
</script>

<template>
  <div class="page">
    <PageHeader kicker="Tienda" title="Punto de venta" lead="Cobra productos y servicios. Cada venta genera su documento DIAN (o queda pendiente si no tienes el módulo)." />

    <div v-if="taxProfileMissing" class="banner warn">
      <AlertTriangle :size="18" class="warn-icon" />
      <div class="warn-text">
        <strong>Configura la identidad fiscal de tu empresa</strong>
        <span>Cada venta genera un documento (tiquete POS o factura) que debe llevar los datos fiscales del emisor. Sin el perfil fiscal no puedes registrar ventas.</span>
      </div>
      <button v-if="canConfigTaxProfile" type="button" class="warn-cta" @click="goToTaxProfile">
        Configurar
      </button>
      <span v-else class="warn-hint">Pídele a un administrador que la configure.</span>
    </div>

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div class="pos">
      <!-- Catálogo -->
      <section class="catalog">
        <div class="catalog-head">
          <div class="modetabs">
            <button type="button" class="modetab" :class="{ active: mode === 'producto' }" @click="mode = 'producto'">
              <Package :size="14" :stroke-width="1.7" /> Productos
            </button>
            <button type="button" class="modetab" :class="{ active: mode === 'servicio' }" @click="mode = 'servicio'">
              <Stethoscope :size="14" :stroke-width="1.7" /> Servicios
            </button>
            <button type="button" class="modetab" :class="{ active: mode === 'paquete' }" @click="mode = 'paquete'">
              <Package :size="14" :stroke-width="1.7" /> Paquetes
            </button>
          </div>

          <template v-if="mode !== 'paquete'">
            <div class="search">
              <Search :size="15" :stroke-width="1.7" class="s-icon" />
              <input
                v-model="query"
                type="search"
                :placeholder="mode === 'producto' ? 'Buscar producto o SKU…' : 'Buscar servicio…'"
              />
            </div>
            <div class="cats">
              <button type="button" class="cat" :class="{ active: cat === '' }" @click="cat = ''">Todos</button>
              <button
                v-for="c in categories"
                :key="c.id"
                type="button"
                class="cat"
                :class="{ active: cat === String(c.id) }"
                @click="cat = String(c.id)"
              >
                {{ c.name }}
              </button>
            </div>
          </template>
        </div>

        <div class="grid">
          <div v-if="mode === 'paquete'" class="grid-empty">El backend aún no soporta paquetes.</div>
          <div v-else-if="catalog.length === 0" class="grid-empty">
            {{ mode === 'producto' ? 'Sin productos para el filtro.' : 'Sin servicios para el filtro.' }}
          </div>
          <button
            v-for="c in catalog"
            :key="`${mode}-${c.id}`"
            type="button"
            class="pcard"
            :class="{ disabled: c.stockState === 'AGOTADO' }"
            :disabled="c.stockState === 'AGOTADO'"
            @click="addToTicket(c)"
          >
            <span v-if="c.promoName" class="promo-badge">Promo</span>
            <div class="pcard-thumb" :style="{ background: c.toneBg, color: c.toneFg }">
              <component :is="c.isService ? Stethoscope : Package" :size="22" :stroke-width="1.6" />
            </div>
            <div class="pcard-name">{{ c.name }}</div>
            <div class="pcard-foot">
              <span class="pcard-price">
                <span v-if="c.promoName" class="price-old">{{ formatMoney(c.basePrice) }}</span>
                {{ formatMoney(c.price) }}
              </span>
              <span
                v-if="!c.isService && c.stockState"
                class="pcard-stock"
                :class="`st-${c.stockState}`"
              >
                {{ c.stockState === 'AGOTADO' ? 'Agotado' : c.stockCount + ' u' }}
              </span>
              <span v-else-if="c.isService" class="pcard-svc">Servicio</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Ticket -->
      <aside class="ticket">
        <header class="ticket-head">
          <Receipt :size="17" :stroke-width="1.7" />
          <span>Ticket de venta</span>
        </header>

        <button type="button" class="customer" @click="toggleCustomer">
          <User :size="14" :stroke-width="1.7" />
          <span>{{ customer ? customer.name : 'Asociar propietario (opcional)' }}</span>
          <X v-if="customer" :size="13" :stroke-width="1.8" class="cust-x" />
        </button>

        <div class="lines">
          <div v-if="isEmpty" class="lines-empty">
            <Receipt :size="26" :stroke-width="1.4" />
            <span>Agrega productos o servicios</span>
          </div>
          <div v-for="l in lines" :key="`${l.kind}-${l.id}`" class="line">
            <div class="line-info">
              <div class="line-name">
                <span v-if="l.kind === 'service'" class="line-tag">Servicio</span>{{ l.name }}
              </div>
              <div class="line-price">
                <span v-if="l.originalUnitPrice != null && l.originalUnitPrice > l.unitPrice" class="price-old">
                  {{ formatMoney(l.originalUnitPrice) }}
                </span>
                {{ formatMoney(l.unitPrice) }} c/u
              </div>
            </div>
            <div class="qty">
              <button type="button" @click="dec(l)"><Minus :size="13" :stroke-width="2" /></button>
              <span>{{ l.qty }}</span>
              <button type="button" @click="inc(l)"><Plus :size="13" :stroke-width="2" /></button>
            </div>
            <div class="line-total">{{ formatMoney(l.unitPrice * l.qty) }}</div>
            <button type="button" class="line-x" aria-label="Quitar" @click="removeLine(l)">
              <Trash2 :size="13" :stroke-width="1.7" />
            </button>
          </div>
        </div>

        <div class="summary">
          <div class="srow"><span>Subtotal (IVA incl.)</span><span>{{ formatMoney(grossSubtotal) }}</span></div>
          <div v-if="promoSavings > 0" class="srow savings"><span>Ahorro por promociones</span><span>−{{ formatMoney(promoSavings) }}</span></div>
          <div class="srow"><span>Base gravable</span><span>{{ formatMoney(baseTotal) }}</span></div>
          <div v-for="r in taxByRate" :key="r.name" class="srow"><span>{{ r.name }} (incluido)</span><span>{{ formatMoney(r.amount) }}</span></div>
          <div class="srow grand"><span>Total</span><span>{{ formatMoney(total) }}</span></div>
          <button type="button" class="charge" :disabled="isEmpty || taxProfileMissing" @click="payOpen = true">
            Cobrar {{ formatMoney(total) }}
          </button>
        </div>
      </aside>
    </div>

    <ModalShell
      :open="custOpen"
      title="Asociar propietario"
      subtitle="Vincula la venta a un cliente (opcional)"
      :icon="User"
      :width="520"
      @close="custOpen = false"
    >
      <template #body>
        <OwnerPicker @select="onSelectCustomer" />
      </template>
    </ModalShell>

    <PayModal :open="payOpen" :total="total" @close="payOpen = false" @confirm="onConfirmPay" />
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
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.banner.warn { display: flex; align-items: flex-start; gap: 12px; background: oklch(97% 0.05 85); border: 1px solid oklch(85% 0.11 85); color: oklch(40% 0.09 70); border-radius: 8px; padding: 12px 14px; margin-bottom: 14px; }
.banner.warn .warn-icon { flex: 0 0 auto; margin-top: 1px; color: oklch(60% 0.15 70); }
.banner.warn .warn-text { display: flex; flex-direction: column; gap: 2px; font-size: 13px; min-width: 0; }
.banner.warn .warn-text strong { font-weight: 600; }
.banner.warn .warn-text span { color: oklch(45% 0.05 70); }
.banner.warn .warn-cta { flex: 0 0 auto; margin-left: auto; align-self: center; border: 1px solid oklch(60% 0.15 70); background: oklch(99% 0.02 85); color: oklch(40% 0.12 70); border-radius: 7px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.banner.warn .warn-cta:hover { background: oklch(95% 0.06 85); }
.banner.warn .warn-hint { flex: 0 0 auto; margin-left: auto; align-self: center; font-size: 12.5px; color: oklch(50% 0.05 70); }

.pos { display: grid; grid-template-columns: 1fr 380px; gap: 18px; align-items: start; }
@media (max-width: 1100px) { .pos { grid-template-columns: 1fr 340px; } }
@media (max-width: 900px) { .pos { grid-template-columns: 1fr; } }

.catalog { display: flex; flex-direction: column; min-height: 0; }
.catalog-head { display: flex; flex-direction: column; gap: 12px; margin-bottom: 14px; }

.modetabs { display: inline-flex; gap: 3px; background: var(--warm-150); border: 1px solid var(--warm-200); border-radius: 9px; padding: 3px; align-self: flex-start; }
.modetab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: none; background: transparent; border-radius: 7px; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--warm-600); cursor: pointer; }
.modetab.active { background: var(--warm-50); color: var(--amatista-700); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }

.search { display: flex; align-items: center; gap: 9px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 10px 13px; }
.search:focus-within { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.s-icon { color: var(--warm-500); flex-shrink: 0; }
.search input { flex: 1; border: none; outline: none; background: transparent; font-family: inherit; font-size: 13.5px; color: var(--warm-900); min-width: 0; }

.cats { display: flex; flex-wrap: wrap; gap: 6px; }
.cat { padding: 6px 13px; border-radius: 999px; background: var(--warm-50); border: 1px solid var(--warm-200); font-family: inherit; font-size: 12.5px; color: var(--warm-700); cursor: pointer; }
.cat:hover { border-color: var(--amatista-300); }
.cat.active { background: var(--amatista-700); color: #fff; border-color: var(--amatista-700); font-weight: 500; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; align-content: start; }
.grid-empty { grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--warm-500); font-size: 13px; }
.pcard { position: relative; display: flex; flex-direction: column; gap: 8px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 12px; padding: 12px; cursor: pointer; font-family: inherit; text-align: left; transition: border-color 0.12s ease, box-shadow 0.12s ease; }
.pcard:hover:not(.disabled) { border-color: var(--amatista-300); box-shadow: 0 4px 14px -8px rgba(20, 15, 30, 0.18); }
.pcard.disabled { opacity: 0.55; cursor: not-allowed; }
.pcard-thumb { height: 56px; border-radius: 9px; display: grid; place-items: center; }
.pcard-thumb.prod { background: var(--warm-150); color: var(--warm-600); }
.pcard-thumb.svc { background: var(--amatista-50); color: var(--amatista-700); }
.pcard-name { font-size: 13px; font-weight: 500; color: var(--warm-900); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 34px; }
.pcard-foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pcard-price { font-size: 14px; font-weight: 600; color: var(--warm-900); }
.price-old { font-size: 11px; color: var(--warm-400); text-decoration: line-through; margin-right: 6px; font-weight: 400; }
.pcard-stock { font-size: 11px; padding: 2px 7px; border-radius: 999px; background: var(--warm-150); color: var(--warm-600); white-space: nowrap; }
.pcard-stock.st-BAJO { background: oklch(94% 0.07 80); color: oklch(45% 0.13 70); }
.pcard-stock.st-AGOTADO { background: oklch(93% 0.06 25); color: oklch(48% 0.19 25); }
.pcard-svc { font-size: 11px; padding: 2px 7px; border-radius: 999px; background: var(--amatista-50); color: var(--amatista-700); }
.promo-badge { position: absolute; top: 8px; right: 8px; z-index: 1; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px 7px; border-radius: 999px; background: oklch(58% 0.18 25); color: #fff; }

.ticket { position: sticky; top: 12px; display: flex; flex-direction: column; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 14px; overflow: hidden; }
.ticket-head { display: flex; align-items: center; gap: 9px; padding: 15px 18px; border-bottom: 1px solid var(--warm-200); font-size: 14px; font-weight: 500; color: var(--warm-900); }
.ticket-head svg { color: var(--amatista-600); }
.customer { display: flex; align-items: center; gap: 8px; width: 100%; padding: 11px 18px; border: none; border-bottom: 1px solid var(--warm-150); background: var(--warm-100); font-family: inherit; font-size: 12.5px; color: var(--warm-700); cursor: pointer; }
.customer:hover { background: var(--warm-150); }
.cust-x { margin-left: auto; }
.lines { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; max-height: 360px; }
.lines-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--warm-400); font-size: 13px; padding: 40px 20px; text-align: center; }
.line { display: flex; align-items: center; gap: 8px; padding: 9px 10px; border-radius: 9px; }
.line:hover { background: var(--warm-100); }
.line-info { flex: 1; min-width: 0; }
.line-name { font-size: 13px; font-weight: 500; color: var(--warm-900); }
.line-tag { display: inline-block; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.04em; font-weight: 600; color: var(--amatista-700); background: var(--amatista-50); padding: 1px 5px; border-radius: 4px; margin-right: 6px; vertical-align: middle; }
.line-price { font-size: 11px; color: var(--warm-500); margin-top: 1px; }
.qty { display: flex; align-items: center; border: 1px solid var(--warm-200); border-radius: 7px; overflow: hidden; }
.qty button { width: 24px; height: 26px; border: none; background: var(--warm-100); color: var(--warm-700); cursor: pointer; display: grid; place-items: center; }
.qty button:hover { background: var(--warm-200); }
.qty span { min-width: 26px; text-align: center; font-size: 13px; font-weight: 500; }
.line-total { font-size: 13px; font-weight: 600; color: var(--warm-900); min-width: 64px; text-align: right; }
.line-x { width: 26px; height: 26px; border: none; background: transparent; color: var(--warm-400); cursor: pointer; border-radius: 6px; display: grid; place-items: center; }
.line-x:hover { background: oklch(94% 0.05 25); color: oklch(48% 0.18 25); }

.summary { border-top: 1px solid var(--warm-200); padding: 14px 18px; display: flex; flex-direction: column; gap: 7px; }
.srow { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-600); }
.srow.savings { color: oklch(45% 0.13 150); }
.srow.grand { font-size: 17px; font-weight: 600; color: var(--warm-900); padding-top: 7px; margin-top: 3px; border-top: 1px solid var(--warm-150); }
.charge { margin-top: 10px; padding: 12px; border-radius: 10px; border: none; background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); color: #fff; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; }
.charge:hover:not(:disabled) { filter: brightness(1.05); }
.charge:disabled { opacity: 0.5; cursor: not-allowed; }
</style>

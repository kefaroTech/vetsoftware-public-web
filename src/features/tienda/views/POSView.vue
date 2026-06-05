<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Minus, Plus, Search, ShoppingCart, Trash2 } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import PayModal from '../components/PayModal.vue'
import ReceiptModal from '../components/ReceiptModal.vue'
import { useTienda } from '../composables/useTienda'
import { applyPromo, computeTotals, formatMoney, stockState, type TotalsBreakdown } from '../composables/pricing'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { useToast } from '@/composables/useToast'
import type { SaleLine } from '../types/tienda'

const store = useTienda()
const toast = useToast()
const today = todayISO()

const tab = ref<'product' | 'service'>('product')
const query = ref('')
const lines = ref<SaleLine[]>([])
const discount = ref('')

const payOpen = ref(false)
const receiptOpen = ref(false)
const receipt = ref<{ lines: SaleLine[]; totals: TotalsBreakdown; method: string; change: number | null } | null>(null)

onMounted(() => store.ensureLoaded())

interface CatalogCard {
  id: number
  name: string
  basePrice: number
  price: number
  promoName: string | null
  hasTax: boolean
  taxPercentage: number
  soldOut: boolean
}

const catalog = computed<CatalogCard[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'product') {
    return store.products.value
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p) => {
        const applied = applyPromo(p, 'product', p.salePrice, p.productCategory.id, store.promotions.value, today)
        return {
          id: p.id, name: p.name, basePrice: p.salePrice, price: applied.unitPrice,
          promoName: applied.promo?.name ?? null,
          hasTax: p.hasTax, taxPercentage: p.hasTax ? p.tax?.percentage ?? 0 : 0,
          soldOut: stockState(p) === 'AGOTADO',
        }
      })
  }
  return store.services.value
    .filter((s) => !q || s.name.toLowerCase().includes(q))
    .map((s) => {
      const applied = applyPromo(s, 'service', s.price, s.serviceCategory.id, store.promotions.value, today)
      return {
        id: s.id, name: s.name, basePrice: s.price, price: applied.unitPrice,
        promoName: applied.promo?.name ?? null,
        hasTax: s.hasTax, taxPercentage: s.hasTax ? s.tax?.percentage ?? 0 : 0,
        soldOut: false,
      }
    })
})

function addToTicket(card: CatalogCard) {
  if (card.soldOut) return
  const kind = tab.value
  const existing = lines.value.find((l) => l.kind === kind && l.id === card.id)
  if (existing) {
    existing.qty += 1
    return
  }
  lines.value.push({
    kind, id: card.id, name: card.name, unitPrice: card.price, qty: 1,
    hasTax: card.hasTax, taxPercentage: card.taxPercentage,
    promoName: card.promoName ?? undefined,
    originalUnitPrice: card.promoName ? card.basePrice : undefined,
  })
}

function inc(line: SaleLine) { line.qty += 1 }
function dec(line: SaleLine) {
  line.qty -= 1
  if (line.qty <= 0) removeLine(line)
}
function removeLine(line: SaleLine) {
  lines.value = lines.value.filter((l) => !(l.kind === line.kind && l.id === line.id))
}

const discountNum = computed(() => Math.max(0, Number(discount.value.replace(',', '.')) || 0))
const totals = computed(() => computeTotals(lines.value, discountNum.value))
const isEmpty = computed(() => lines.value.length === 0)

function onConfirmPay(method: string, received: number | null) {
  receipt.value = {
    lines: lines.value.map((l) => ({ ...l })),
    totals: totals.value,
    method,
    change: received != null ? Math.max(0, received - totals.value.total) : null,
  }
  payOpen.value = false
  receiptOpen.value = true
  lines.value = []
  discount.value = ''
  toast.success('Cobro registrado', 'Recibo generado (demo, no persistido).')
}
</script>

<template>
  <div class="page">
    <PageHeader kicker="Tienda" title="Punto de venta" lead="Cobra productos y servicios. El cobro es una demo client-side (sin persistir)." />

    <div v-if="store.error.value" class="banner error">{{ store.error.value }}</div>

    <div class="pos">
      <!-- Catálogo -->
      <section class="catalog-col">
        <div class="tabs">
          <button type="button" class="tab" :class="{ active: tab === 'product' }" @click="tab = 'product'">Productos</button>
          <button type="button" class="tab" :class="{ active: tab === 'service' }" @click="tab = 'service'">Servicios</button>
        </div>
        <div class="search">
          <Search :size="14" :stroke-width="1.7" class="s-icon" />
          <input v-model="query" type="text" class="s-input" placeholder="Buscar…" />
        </div>
        <div class="grid">
          <button
            v-for="c in catalog"
            :key="`${tab}-${c.id}`"
            type="button"
            class="prod"
            :class="{ disabled: c.soldOut }"
            :disabled="c.soldOut"
            @click="addToTicket(c)"
          >
            <span class="p-name">{{ c.name }}</span>
            <span class="p-price">
              <span v-if="c.promoName" class="p-old">{{ formatMoney(c.basePrice) }}</span>
              {{ formatMoney(c.price) }}
            </span>
            <span v-if="c.promoName" class="p-promo">Promo</span>
            <span v-if="c.soldOut" class="p-out">Agotado</span>
          </button>
          <p v-if="catalog.length === 0" class="empty">No hay ítems en este catálogo.</p>
        </div>
      </section>

      <!-- Ticket -->
      <aside class="ticket-col">
        <div class="ticket-head">
          <ShoppingCart :size="16" :stroke-width="1.8" />
          <span>Ticket</span>
        </div>
        <div v-if="isEmpty" class="ticket-empty">Agrega productos o servicios al ticket.</div>
        <ul v-else class="ticket-lines">
          <li v-for="l in lines" :key="`${l.kind}-${l.id}`" class="t-line">
            <div class="t-info">
              <span class="t-name">{{ l.name }}</span>
              <span class="t-price">{{ formatMoney(l.unitPrice) }} c/u</span>
            </div>
            <div class="t-qty">
              <button type="button" class="q-btn" @click="dec(l)"><Minus :size="13" :stroke-width="2" /></button>
              <span class="q-val">{{ l.qty }}</span>
              <button type="button" class="q-btn" @click="inc(l)"><Plus :size="13" :stroke-width="2" /></button>
            </div>
            <span class="t-total">{{ formatMoney(l.unitPrice * l.qty) }}</span>
            <button type="button" class="t-remove" @click="removeLine(l)"><Trash2 :size="14" :stroke-width="1.7" /></button>
          </li>
        </ul>

        <div class="ticket-foot">
          <label class="disc">
            <span>Descuento manual</span>
            <input v-model="discount" type="text" inputmode="decimal" placeholder="0" class="disc-input" />
          </label>
          <div class="srow"><span>Subtotal</span><span>{{ formatMoney(totals.net) }}</span></div>
          <div v-if="totals.promoSavings > 0" class="srow saving"><span>Ahorro</span><span>− {{ formatMoney(totals.promoSavings) }}</span></div>
          <div class="srow"><span>Impuestos</span><span>{{ formatMoney(totals.tax) }}</span></div>
          <div class="srow total"><span>Total</span><span>{{ formatMoney(totals.total) }}</span></div>
          <button type="button" class="cobrar" :disabled="isEmpty" @click="payOpen = true">Cobrar</button>
        </div>
      </aside>
    </div>

    <PayModal :open="payOpen" :total="totals.total" @close="payOpen = false" @confirm="onConfirmPay" />
    <ReceiptModal
      v-if="receipt"
      :open="receiptOpen"
      :lines="receipt.lines"
      :totals="receipt.totals"
      :method="receipt.method"
      :change="receipt.change"
      @close="receiptOpen = false"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.pos { display: grid; grid-template-columns: 1fr 360px; gap: 22px; align-items: start; }
@media (max-width: 900px) { .pos { grid-template-columns: 1fr; } }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--warm-200); margin-bottom: 12px; }
.tab { padding: 8px 14px; font-size: 13px; font-family: inherit; cursor: pointer; background: transparent; border: none; color: var(--warm-600); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--amatista-700); border-bottom-color: var(--amatista-700); font-weight: 500; }
.search { position: relative; display: flex; align-items: center; margin-bottom: 12px; }
.s-icon { position: absolute; left: 12px; color: var(--warm-500); }
.s-input { width: 100%; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 9px; padding: 9px 12px 9px 34px; font-family: inherit; font-size: 13px; color: var(--warm-900); outline: none; }
.s-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.prod {
  position: relative; text-align: left; font-family: inherit; cursor: pointer; padding: 14px; border-radius: 11px;
  background: var(--warm-50); border: 1px solid var(--warm-200); display: flex; flex-direction: column; gap: 6px; min-height: 84px;
  transition: border-color 0.12s, box-shadow 0.12s;
}
.prod:hover:not(.disabled) { border-color: var(--amatista-300); box-shadow: 0 4px 12px -8px oklch(40% 0.18 var(--hue) / 0.3); }
.prod.disabled { opacity: 0.55; cursor: not-allowed; }
.p-name { font-size: 13px; font-weight: 500; color: var(--warm-900); }
.p-price { font-size: 14px; color: var(--warm-800); display: flex; align-items: center; gap: 6px; }
.p-old { font-size: 11.5px; color: var(--warm-500); text-decoration: line-through; }
.p-promo { position: absolute; top: 8px; right: 8px; font-size: 10px; font-weight: 500; padding: 2px 6px; border-radius: 999px; background: oklch(94% 0.06 150); color: oklch(40% 0.13 150); }
.p-out { font-size: 11px; color: oklch(48% 0.18 25); }
.empty { font-size: 13px; color: var(--warm-500); padding: 16px; grid-column: 1 / -1; }
.ticket-col { position: sticky; top: 12px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.ticket-head { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--warm-800); }
.ticket-empty { font-size: 13px; color: var(--warm-500); padding: 20px 0; text-align: center; }
.ticket-lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow: auto; }
.t-line { display: grid; grid-template-columns: 1fr auto auto auto; align-items: center; gap: 8px; }
.t-info { min-width: 0; }
.t-name { font-size: 13px; color: var(--warm-900); display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.t-price { font-size: 11px; color: var(--warm-500); }
.t-qty { display: flex; align-items: center; gap: 4px; }
.q-btn { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer; display: grid; place-items: center; }
.q-btn:hover { background: var(--warm-100); }
.q-val { font-size: 13px; min-width: 18px; text-align: center; }
.t-total { font-size: 13px; font-weight: 500; color: var(--warm-900); white-space: nowrap; }
.t-remove { background: transparent; border: none; color: var(--warm-400); cursor: pointer; padding: 2px; }
.t-remove:hover { color: oklch(48% 0.18 25); }
.ticket-foot { border-top: 1px solid var(--warm-200); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.disc { display: flex; align-items: center; justify-content: space-between; font-size: 12.5px; color: var(--warm-600); }
.disc-input { width: 100px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 8px; padding: 6px 10px; font-family: inherit; font-size: 13px; text-align: right; outline: none; }
.disc-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.srow { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--warm-700); }
.srow.saving { color: oklch(45% 0.13 150); }
.srow.total { font-size: 16px; font-weight: 600; color: var(--warm-900); padding-top: 6px; border-top: 1px solid var(--warm-200); }
.cobrar {
  margin-top: 6px; padding: 12px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
}
.cobrar:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
</style>

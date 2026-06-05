<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Minus, Plus, Search, Wallet, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import OwnerPicker from './OwnerPicker.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import type { OpenAccountResponse } from '../types/cuentas'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [account: OpenAccountResponse] }>()

const tienda = useTienda()
const store = useCuentas()
const toast = useToast()

// ── Carrito de cargos a registrar ────────────────────────────────────────────
type CartKind = 'service' | 'product' | 'general'
interface CartLine {
  kind: CartKind
  /** id del catálogo (service/product); null para general. */
  refId: number | null
  name: string
  unitPrice: number
  qty: number
  /** animalId destino (service/product); null para general. */
  animalId: number | null
  animalName: string | null
  /** Solo para general. */
  taxId?: number | null
  hasTax?: boolean
}

type PetSel = number | 'general'

const pickedOwner = ref<OwnerResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])
const dupAccount = ref<OpenAccountResponse | null>(null)
const busy = ref(false)

const selectedPet = ref<PetSel>('general')
const tab = ref<'service' | 'product'>('service')
const query = ref('')
const cart = ref<CartLine[]>([])

// Cargo general (mini-form)
const general = reactive({ name: '', unitAmount: '', quantity: '1', taxId: '', hasTax: false })

watch(
  () => props.open,
  (open) => {
    if (!open) return
    tienda.ensureLoaded()
    pickedOwner.value = null
    ownerPets.value = []
    dupAccount.value = null
    busy.value = false
    selectedPet.value = 'general'
    tab.value = 'service'
    query.value = ''
    cart.value = []
    Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '', hasTax: false })
  },
)

async function onOwnerPicked(owner: OwnerResponse) {
  pickedOwner.value = owner
  ownerPets.value = []
  dupAccount.value = null
  selectedPet.value = 'general'
  try {
    const animals = await animalApi.listByOwner(owner.id)
    ownerPets.value = animals.map((a) => ({ id: a.id, name: a.name }))
  } catch {
    ownerPets.value = []
  }
  try {
    dupAccount.value = await store.findOpenAccountByOwner(owner.id)
  } catch {
    dupAccount.value = null
  }
}

function changeOwner() {
  pickedOwner.value = null
  ownerPets.value = []
  dupAccount.value = null
  cart.value = []
}

const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...tienda.taxes.value.map((t) => ({ value: String(t.id), label: `${t.name} (${t.percentage}%)` })),
])

const isGeneral = computed(() => selectedPet.value === 'general')

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'service') {
    return tienda.services.value
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.serviceCategory?.name.toLowerCase().includes(q))
      .map((s) => ({ id: s.id, name: s.name, price: s.price, soldOut: false }))
  }
  return tienda.products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q) || p.productCategory?.name.toLowerCase().includes(q))
    .map((p) => ({ id: p.id, name: p.name, price: p.salePrice, soldOut: p.currentStock <= 0 }))
})

const total = computed(() => cart.value.reduce((sum, l) => sum + l.unitPrice * l.qty, 0))

function addCatalogItem(item: { id: number; name: string; price: number; soldOut: boolean }) {
  if (isGeneral.value || item.soldOut) return
  const animalId = selectedPet.value as number
  const animalName = ownerPets.value.find((p) => p.id === animalId)?.name ?? null
  const kind = tab.value
  const line = cart.value.find((l) => l.kind === kind && l.refId === item.id && l.animalId === animalId)
  if (line) line.qty += 1
  else
    cart.value.push({
      kind,
      refId: item.id,
      name: item.name,
      unitPrice: item.price,
      qty: 1,
      animalId,
      animalName,
    })
}

const canAddGeneral = computed(
  () => general.name.trim().length >= 2 && Number(general.unitAmount.replace(',', '.')) > 0,
)

function addGeneralToCart() {
  if (!canAddGeneral.value) return
  cart.value.push({
    kind: 'general',
    refId: null,
    name: general.name.trim(),
    unitPrice: Number(general.unitAmount.replace(',', '.')),
    qty: Number(general.quantity.replace(',', '.')) || 1,
    animalId: null,
    animalName: null,
    taxId: general.taxId ? Number(general.taxId) : null,
    hasTax: general.hasTax,
  })
  Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '', hasTax: false })
}

function lineLabel(line: CartLine): string {
  return line.kind === 'general' ? 'General' : line.animalName ?? 'Mascota'
}

function setQty(line: CartLine, n: number) {
  const q = Math.max(0, Math.floor(n) || 0)
  if (q <= 0) cart.value = cart.value.filter((l) => l !== line)
  else line.qty = q
}

function removeLine(line: CartLine) {
  cart.value = cart.value.filter((l) => l !== line)
}

const canConfirm = computed(
  () => !!pickedOwner.value && !dupAccount.value && cart.value.length > 0 && !busy.value,
)

async function confirm() {
  if (!canConfirm.value || !pickedOwner.value) return
  busy.value = true
  try {
    const account = await store.openAccount(pickedOwner.value.id)

    // Agrupar líneas product/service por animalId → un batch por mascota.
    const batchByAnimal = new Map<number, { kind: 'service' | 'product'; id: number; qty: number }[]>()
    for (const l of cart.value) {
      if (l.kind === 'general' || l.refId == null || l.animalId == null) continue
      const items = batchByAnimal.get(l.animalId) ?? []
      items.push({ kind: l.kind, id: l.refId, qty: l.qty })
      batchByAnimal.set(l.animalId, items)
    }
    for (const [animalId, items] of batchByAnimal) {
      await store.addChargesBatch(account.id, animalId, items)
    }

    // Cargos generales, uno por uno.
    for (const l of cart.value) {
      if (l.kind !== 'general') continue
      await store.addGeneralCharge({
        name: l.name,
        unitAmount: l.unitPrice,
        quantity: l.qty,
        taxId: l.taxId ? Number(l.taxId) : null,
        hasTax: !!l.hasTax,
        openAccountId: account.id,
      })
    }

    await store.refreshAccount(account.id)
    const fresh = store.accounts.value.find((a) => a.id === account.id) ?? account
    const count = cart.value.length
    toast.success(
      'Cuenta abierta',
      `${pickedOwner.value.name} con ${count} cargo${count === 1 ? '' : 's'}.`,
    )
    emit('created', fresh)
    emit('close')
  } catch (e) {
    toast.error('Ocurrió un error', getProblemDetailMessage(e, 'No se pudo abrir la cuenta'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Abrir cuenta"
    subtitle="Elige el propietario y agrega los cargos"
    :icon="Wallet"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <!-- Paso 1 · elegir propietario -->
      <OwnerPicker v-if="!pickedOwner" @select="onOwnerPicked" />

      <!-- Paso 2 · builder de cargos -->
      <template v-else>
        <div class="owner-card">
          <span class="avatar">{{ initials(pickedOwner.name) }}</span>
          <div class="who-text">
            <div class="name">{{ pickedOwner.name }}</div>
            <div class="meta">{{ pickedOwner.document }} · {{ pickedOwner.phone }}</div>
          </div>
          <button type="button" class="change" @click="changeOwner">Cambiar</button>
        </div>

        <div v-if="dupAccount" class="dup-warn">
          <Wallet :size="15" :stroke-width="1.8" />
          <span>
            <strong>{{ pickedOwner.name }}</strong> ya tiene una cuenta abierta. Ábrela desde la lista
            para agregar cargos.
          </span>
        </div>

        <template v-else>
          <!-- Selector de mascota / general -->
          <div class="section">
            <div class="label">¿Para cuál mascota?</div>
            <div class="chips">
              <button
                v-for="p in ownerPets"
                :key="p.id"
                type="button"
                class="chip"
                :class="{ active: selectedPet === p.id }"
                @click="selectedPet = p.id"
              >
                {{ p.name }}
              </button>
              <button
                type="button"
                class="chip"
                :class="{ active: selectedPet === 'general' }"
                @click="selectedPet = 'general'"
              >
                General
              </button>
            </div>
          </div>

          <!-- Catálogo servicios/productos -->
          <template v-if="!isGeneral">
            <div class="tabs">
              <button type="button" class="tab" :class="{ active: tab === 'service' }" @click="tab = 'service'; query = ''">Servicios</button>
              <button type="button" class="tab" :class="{ active: tab === 'product' }" @click="tab = 'product'; query = ''">Productos</button>
            </div>
            <div class="search">
              <Search :size="14" :stroke-width="1.7" class="s-icon" />
              <input v-model="query" type="text" class="s-input" placeholder="Buscar por nombre o categoría…" />
            </div>
            <ul class="catalog">
              <li v-for="it in catalog" :key="it.id" class="cat-row" :class="{ disabled: it.soldOut }">
                <span class="cat-name">{{ it.name }}</span>
                <span v-if="it.soldOut" class="badge-out">Agotado</span>
                <span v-else class="cat-price">{{ formatMoney(it.price) }}</span>
                <button type="button" class="add-btn" :disabled="it.soldOut" @click="addCatalogItem(it)">
                  <Plus :size="14" :stroke-width="1.9" /> Agregar
                </button>
              </li>
              <li v-if="catalog.length === 0" class="empty">No hay ítems en este catálogo.</li>
            </ul>
          </template>

          <!-- Cargo general -->
          <div v-else class="general-form">
            <BaseField label="Concepto" required>
              <template #default="{ id }">
                <BaseInput :id="id" v-model="general.name" placeholder="Ej. Insumo, recargo…" />
              </template>
            </BaseField>
            <div class="grid">
              <BaseField label="Valor unitario" required>
                <template #default="{ id }">
                  <BaseInput :id="id" v-model="general.unitAmount" inputmode="decimal" placeholder="0" />
                </template>
              </BaseField>
              <BaseField label="Cantidad" required>
                <template #default="{ id }">
                  <BaseInput :id="id" v-model="general.quantity" inputmode="decimal" placeholder="1" />
                </template>
              </BaseField>
              <BaseField label="Impuesto">
                <template #default="{ id }">
                  <BaseSelect :id="id" v-model="general.taxId" :options="taxOptions" placeholder="Sin impuesto" />
                </template>
              </BaseField>
            </div>
            <label class="check">
              <input v-model="general.hasTax" type="checkbox" />
              <span>Aplica impuesto</span>
            </label>
            <button type="button" class="add-btn solid" :disabled="!canAddGeneral" @click="addGeneralToCart">
              <Plus :size="14" :stroke-width="1.9" /> Agregar al carrito
            </button>
          </div>

          <!-- Panel carrito -->
          <div class="cart">
            <div class="cart-head">Cargos a registrar</div>
            <ul v-if="cart.length" class="cart-list">
              <li v-for="(line, i) in cart" :key="i" class="cart-row">
                <span class="cl-info">
                  <span class="cl-name">{{ line.name }}</span>
                  <span class="cl-tag">{{ lineLabel(line) }} · {{ formatMoney(line.unitPrice) }}</span>
                </span>
                <span class="stepper">
                  <button type="button" class="st-btn" @click="setQty(line, line.qty - 1)"><Minus :size="12" :stroke-width="2.2" /></button>
                  <input
                    class="st-input"
                    type="text"
                    inputmode="numeric"
                    :value="line.qty"
                    @input="setQty(line, Number(($event.target as HTMLInputElement).value))"
                  />
                  <button type="button" class="st-btn" @click="setQty(line, line.qty + 1)"><Plus :size="12" :stroke-width="2.2" /></button>
                </span>
                <span class="cl-total">{{ formatMoney(line.unitPrice * line.qty) }}</span>
                <button type="button" class="cl-remove" title="Quitar" @click="removeLine(line)"><X :size="13" :stroke-width="1.9" /></button>
              </li>
            </ul>
            <div v-else class="cart-empty">Agrega al menos un cargo para abrir la cuenta.</div>
          </div>
        </template>
      </template>
    </template>

    <template #footer-left>
      <span v-if="pickedOwner && !dupAccount && cart.length" class="foottotal">
        Total cargos <strong>{{ formatMoney(total) }}</strong>
      </span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
        {{ busy ? 'Abriendo…' : 'Abrir cuenta' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Tarjeta del propietario */
.owner-card { display: flex; align-items: center; gap: 11px; padding: 12px; margin-bottom: 16px; background: var(--warm-100); border-radius: 11px; }
.avatar { width: 40px; height: 40px; border-radius: 11px; background: var(--amatista-100); color: var(--amatista-700); display: grid; place-items: center; font-family: var(--font-serif); font-size: 15px; font-weight: 500; flex-shrink: 0; }
.who-text { min-width: 0; flex: 1; }
.who-text .name { font-size: 14px; font-weight: 500; color: var(--warm-900); }
.who-text .meta { font-size: 12px; color: var(--warm-500); margin-top: 1px; }
.change { margin-left: auto; background: transparent; border: none; color: var(--amatista-700); font-family: inherit; font-size: 12.5px; font-weight: 500; cursor: pointer; }

.dup-warn { display: flex; align-items: center; gap: 9px; padding: 11px 14px; border-radius: 10px; font-size: 13px; background: oklch(95% 0.06 80); border: 1px solid oklch(88% 0.09 80); color: oklch(40% 0.10 70); }
.dup-warn strong { font-weight: 600; }

/* Selector de mascota */
.section { margin-bottom: 16px; }
.label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 500; margin-bottom: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { padding: 7px 14px; border-radius: 999px; font-size: 13px; font-family: inherit; cursor: pointer; background: var(--warm-100); border: 1px solid var(--warm-200); color: var(--warm-700); }
.chip.active { background: var(--amatista-50); border-color: var(--amatista-400); color: var(--amatista-700); font-weight: 500; }

/* Tabs + búsqueda */
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--warm-200); margin-bottom: 12px; }
.tab { padding: 8px 14px; font-size: 13px; font-family: inherit; cursor: pointer; background: transparent; border: none; color: var(--warm-600); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active { color: var(--amatista-700); border-bottom-color: var(--amatista-700); font-weight: 500; }
.search { position: relative; display: flex; align-items: center; margin-bottom: 12px; }
.s-icon { position: absolute; left: 13px; color: var(--warm-500); }
.s-input { width: 100%; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px; padding: 10px 14px 10px 38px; font-family: inherit; font-size: 13.5px; color: var(--warm-900); outline: none; }
.s-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }

/* Catálogo */
.catalog { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow: auto; }
.cat-row { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px; transition: border-color 0.12s, background 0.12s; }
.cat-row:hover:not(.disabled) { border-color: var(--amatista-300); background: var(--amatista-50); }
.cat-row.disabled { opacity: 0.6; }
.cat-name { flex: 1; font-size: 13.5px; color: var(--warm-900); }
.cat-price { font-size: 13px; color: var(--warm-600); font-variant-numeric: tabular-nums; }
.badge-out { font-size: 10.5px; font-weight: 600; color: oklch(48% 0.18 25); background: oklch(95% 0.06 25); border-radius: 999px; padding: 2px 8px; }
.add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 12.5px; font-weight: 500; border-radius: 8px; cursor: pointer; font-family: inherit; background: var(--amatista-50); color: var(--amatista-700); border: 1px solid var(--amatista-200); }
.add-btn:hover:not(:disabled) { background: var(--amatista-100); }
.add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.add-btn.solid { background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); color: white; border: none; padding: 9px 16px; font-size: 13px; align-self: flex-start; }

/* Cargo general */
.general-form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--warm-800); cursor: pointer; }
.check input { width: 16px; height: 16px; accent-color: var(--amatista-600); }
.empty { font-size: 13px; color: var(--warm-500); text-align: center; padding: 16px; }

/* Carrito */
.cart { border: 1px solid var(--warm-200); border-radius: 12px; background: var(--warm-50); overflow: hidden; }
.cart-head { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--warm-500); font-weight: 600; padding: 13px 16px; border-bottom: 1px solid var(--warm-200); }
.cart-list { list-style: none; margin: 0; padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 6px; }
.cart-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 9px; background: var(--warm-100); }
.cl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cl-name { font-size: 13px; color: var(--warm-900); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-tag { font-size: 11px; color: var(--warm-500); }
.stepper { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; }
.st-btn { width: 20px; height: 20px; display: grid; place-items: center; border-radius: 6px; cursor: pointer; border: 1px solid var(--warm-200); background: var(--warm-50); color: var(--warm-700); }
.st-btn:hover { border-color: var(--amatista-300); color: var(--amatista-700); }
.st-input { width: 30px; text-align: center; font-family: inherit; font-size: 12.5px; font-weight: 600; color: var(--warm-800); border: 1px solid var(--warm-200); border-radius: 6px; padding: 3px 0; outline: none; background: var(--warm-50); font-variant-numeric: tabular-nums; }
.st-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 2px var(--amatista-50); }
.cl-total { font-size: 13px; font-weight: 500; color: var(--warm-900); font-variant-numeric: tabular-nums; white-space: nowrap; min-width: 64px; text-align: right; }
.cl-remove { width: 22px; height: 22px; flex-shrink: 0; border: none; background: transparent; color: var(--warm-400); cursor: pointer; border-radius: 5px; display: grid; place-items: center; }
.cl-remove:hover { background: oklch(94% 0.05 25); color: oklch(48% 0.18 25); }
.cart-empty { padding: 24px 16px; text-align: center; font-size: 13px; color: var(--warm-400); }

/* Footer */
.foottotal { font-size: 13px; color: var(--warm-600); }
.foottotal strong { font-size: 15px; color: var(--amatista-700); font-variant-numeric: tabular-nums; margin-left: 4px; }
.btn-primary { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; border: none; color: white; background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); }
.btn-ghost:hover { background: var(--warm-100); }
</style>

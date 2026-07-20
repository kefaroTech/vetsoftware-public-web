<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowRight, MapPin, Minus, PawPrint, Plus, Search, Wallet, X } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import FeCustomerPicker from '@/features/facturacion/components/FeCustomerPicker.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { buildCreateAnimalRequest } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { CreateGeneralChargePayload, OpenAccountResponse } from '../types/cuentas'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/api/owner.api'
import type { PetDraft } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [account: OpenAccountResponse] }>()

const tienda = useTienda()
const store = useCuentas()
const toast = useToast()
const branchStore = useBranchStore()
const { companyId } = useAuth()

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

// ── Marcadores de idempotencia para el reintento de "Abrir cuenta" ───────────
// La cuenta se crea una sola vez y cada cargo (un POST por unidad) se marca al
// persistirse; tras un fallo parcial, reintentar continúa sin duplicar nada.
type ChargeOp =
  | { type: 'product' | 'service'; animalId: number; refId: number; reqId: string; done: boolean }
  | { type: 'general'; payload: Omit<CreateGeneralChargePayload, 'openAccountId'>; reqId: string; done: boolean }
const createdAccount = ref<OpenAccountResponse | null>(null)
const pendingOps = ref<ChargeOp[]>([])

// Cargo general (mini-form)
const general = reactive({ name: '', unitAmount: '', quantity: '1', taxId: '' })

// COP en enteros: se descartan no-dígitos (incl. separador de miles) en el valor unitario y se fuerza la
// cantidad a un entero. Evita `Number("50.000") === 50` y fracciones/cantidades inválidas que antes pasaban
// vía `Number(x.replace(',', '.'))`.
const unitAmountDigits = computed(() => general.unitAmount.replace(/\D/g, ''))
const unitAmountNum = computed(() => Number(unitAmountDigits.value) || 0)
const unitAmountDisplay = computed({
  get: () => (general.unitAmount === '' ? '' : formatMoney(unitAmountNum.value)),
  set: (v: string) => {
    general.unitAmount = v.replace(/\D/g, '')
  },
})
const quantityNum = computed(() => Number(general.quantity.replace(/\D/g, '')) || 0)
const quantityDisplay = computed({
  get: () => general.quantity,
  set: (v: string) => {
    general.quantity = v.replace(/\D/g, '')
  },
})

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
    createdAccount.value = null
    pendingOps.value = []
    petCreating.value = false
    petError.value = null
    petDraft.value = defaultPetDraft()
    Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
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
  petCreating.value = false
  petError.value = null
  // Si hubo creación parcial para el dueño anterior, su cuenta persiste en el servidor
  // (aparecerá en la lista); el modal arranca limpio para el nuevo dueño.
  createdAccount.value = null
  pendingOps.value = []
}

// ── Registrar mascota nueva dentro del modal (opcional) ──────────────────────
function defaultPetDraft(): PetDraft {
  return {
    name: '', chipNumber: '', specieId: '', breedId: '', gender: '', colorId: '',
    bod: '', animalType: 'NONE', weight: '', weightType: 'KILOGRAMS', size: '', reproductiveState: '',
  }
}
const petCreating = ref(false)
const petDraft = ref<PetDraft>(defaultPetDraft())
const petFormRef = ref<{ validate: () => boolean } | null>(null)
const petBusy = ref(false)
const petError = ref<string | null>(null)

function startCreatePet() {
  petDraft.value = defaultPetDraft()
  petError.value = null
  petCreating.value = true
}
function cancelCreatePet() {
  petCreating.value = false
  petError.value = null
}
async function submitPet() {
  const owner = pickedOwner.value
  if (!owner || petBusy.value) return
  if (petFormRef.value && !petFormRef.value.validate()) {
    petError.value = 'Revisa los campos marcados antes de continuar.'
    return
  }
  if (companyId.value == null) {
    petError.value = 'No se pudo identificar la empresa. Vuelve a iniciar sesión.'
    return
  }
  petBusy.value = true
  petError.value = null
  try {
    const payload = buildCreateAnimalRequest(petDraft.value, String(owner.id), companyId.value)
    const created = await animalApi.create(payload)
    ownerPets.value = [...ownerPets.value, { id: created.id, name: created.name }]
    selectedPet.value = created.id
    petCreating.value = false
    toast.success('Mascota registrada', `${created.name} quedó registrada y seleccionada.`)
  } catch (e) {
    petError.value = getProblemDetailMessage(e, 'No se pudo registrar la mascota. Intenta nuevamente.')
  } finally {
    petBusy.value = false
  }
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
    // Stock por sede (F4): agotado según el saldo de la sede activa si está cargado; si no, no se marca (el backend valida).
    .map((p) => ({ id: p.id, name: p.name, price: p.salePrice, soldOut: (tienda.stockByProduct.value[p.id]?.quantity ?? 1) <= 0 }))
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
  // Monto libre por diseño (sin catálogo): se permite 0, pero exige un valor explícito; la cantidad debe ser entera >= 1.
  () => general.name.trim().length >= 2 && unitAmountDigits.value !== '' && quantityNum.value >= 1,
)

function addGeneralToCart() {
  if (!canAddGeneral.value) return
  cart.value.push({
    kind: 'general',
    refId: null,
    name: general.name.trim(),
    unitPrice: unitAmountNum.value,
    qty: quantityNum.value || 1,
    animalId: null,
    animalName: null,
    taxId: general.taxId ? Number(general.taxId) : null,
    hasTax: general.taxId !== '',
  })
  Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
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
  () =>
    !!pickedOwner.value &&
    branchStore.selectedBranchId != null &&
    !dupAccount.value &&
    !petCreating.value &&
    cart.value.length > 0 &&
    !busy.value,
)

// Hubo una creación parcial (la cuenta existe pero faltan cargos por persistir).
const retryHint = computed(
  () => !busy.value && !!createdAccount.value && pendingOps.value.some((o) => !o.done),
)

function goToExistingAccount(): void {
  if (!dupAccount.value) return
  emit('created', dupAccount.value)
  emit('close')
}

/** Aplana el carrito a POSTs individuales (1 cargo por unidad); base de la idempotencia. */
function buildOps(): ChargeOp[] {
  const ops: ChargeOp[] = []
  for (const l of cart.value) {
    if (l.kind === 'general') {
      ops.push({
        type: 'general',
        payload: {
          name: l.name,
          unitAmount: l.unitPrice,
          quantity: l.qty,
          taxId: l.taxId ? Number(l.taxId) : null,
          hasTax: !!l.hasTax,
        },
        // Idempotency key estable por op: un reintento tras fallo parcial reusa la clave → el backend no duplica.
        reqId: crypto.randomUUID(),
        done: false,
      })
    } else if (l.refId != null && l.animalId != null) {
      for (let i = 0; i < l.qty; i++) {
        ops.push({ type: l.kind, animalId: l.animalId, refId: l.refId, reqId: crypto.randomUUID(), done: false })
      }
    }
  }
  return ops
}

async function confirm() {
  if (!canConfirm.value || !pickedOwner.value) return
  busy.value = true
  try {
    // 1. Crear la cuenta una sola vez (idempotente en reintento tras fallo parcial).
    if (!createdAccount.value) {
      createdAccount.value = await store.openAccount(pickedOwner.value.id)
    }
    const accountId = createdAccount.value.id

    // 2. Aplanar el carrito una sola vez; cada op se marca al persistirse.
    if (pendingOps.value.length === 0) pendingOps.value = buildOps()
    for (const op of pendingOps.value) {
      if (op.done) continue
      if (op.type === 'general') {
        await store.addGeneralChargeNoRefresh({ ...op.payload, openAccountId: accountId, clientRequestId: op.reqId })
      } else {
        await store.addChargeUnit(accountId, op.animalId, op.type, op.refId, op.reqId)
      }
      op.done = true
    }

    // 3. Refrescar una sola vez al final.
    await store.refreshAccount(accountId)
    const fresh = store.accounts.value.find((a) => a.id === accountId) ?? createdAccount.value
    const count = pendingOps.value.length
    toast.success(
      'Cuenta abierta',
      `${pickedOwner.value.name} con ${count} cargo${count === 1 ? '' : 's'}.`,
    )
    emit('created', fresh)
    emit('close')
  } catch (e) {
    // Los marcadores (createdAccount + ops.done) persisten → el reintento salta lo ya guardado.
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
      <div v-if="branchStore.selectedBranchId == null" class="dup-warn">
        <MapPin :size="15" :stroke-width="1.8" />
        <span>Selecciona una sede antes de abrir una cuenta.</span>
      </div>

      <!-- Paso 1 · elegir o crear propietario -->
      <FeCustomerPicker v-else-if="!pickedOwner" mode="basic" @pick="onOwnerPicked" />

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
            <strong>{{ pickedOwner.name }}</strong> ya tiene una cuenta abierta en
            {{ dupAccount.branch.name }}. Puedes ir directamente al detalle para agregar cargos.
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
              <button v-if="!petCreating" type="button" class="chip add" @click="startCreatePet">
                <Plus :size="13" :stroke-width="2.2" /> Registrar mascota
              </button>
            </div>
          </div>

          <!-- Registrar mascota nueva (form completo) -->
          <div v-if="petCreating" class="petcreate">
            <PetForm ref="petFormRef" :model-value="petDraft" />
            <p v-if="petError" class="pet-err">{{ petError }}</p>
            <div class="petcreate-actions">
              <button type="button" class="btn-ghost" @click="cancelCreatePet">Cancelar</button>
              <button type="button" class="btn-primary" :disabled="petBusy" @click="submitPet">
                <PawPrint :size="15" :stroke-width="1.9" />
                {{ petBusy ? 'Registrando…' : 'Registrar mascota' }}
              </button>
            </div>
          </div>

          <template v-else>
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
                  <BaseInput :id="id" v-model="unitAmountDisplay" inputmode="numeric" placeholder="0" />
                </template>
              </BaseField>
              <BaseField label="Cantidad" required>
                <template #default="{ id }">
                  <BaseInput :id="id" v-model="quantityDisplay" inputmode="numeric" placeholder="1" />
                </template>
              </BaseField>
              <BaseField label="Impuesto">
                <template #default="{ id }">
                  <BaseSelect :id="id" v-model="general.taxId" :options="taxOptions" placeholder="Sin impuesto" />
                </template>
              </BaseField>
            </div>
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

          <div v-if="retryHint" class="dup-warn" style="margin-top: 12px">
            <Wallet :size="15" :stroke-width="1.8" />
            <span>
              La cuenta ya se creó; reintenta <strong>Abrir cuenta</strong> para registrar los
              cargos restantes.
            </span>
          </div>
          </template>
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
      <button v-if="dupAccount" type="button" class="btn-primary" @click="goToExistingAccount">
        Ir al detalle de la cuenta <ArrowRight :size="15" :stroke-width="1.9" />
      </button>
      <button v-else type="button" class="btn-primary" :disabled="!canConfirm" @click="confirm">
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
.chip.add { display: inline-flex; align-items: center; gap: 5px; background: var(--amatista-50); border: 1.5px dashed var(--amatista-300); color: var(--amatista-700); font-weight: 600; }
.chip.add:hover { background: var(--amatista-100); }

/* Registrar mascota nueva */
.petcreate { display: flex; flex-direction: column; gap: 14px; }
.petcreate-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }
.pet-err { margin: 0; padding: 10px 12px; border-radius: 9px; font-size: 12.5px; background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.1 25); color: oklch(48% 0.16 25); }

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
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
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
.btn-primary { display: inline-flex; align-items: center; gap: 6px; font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; border: none; color: white; background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5))); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-ghost { font-family: inherit; font-size: 13.5px; font-weight: 500; padding: 10px 18px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700); }
.btn-ghost:hover { background: var(--warm-100); }
</style>

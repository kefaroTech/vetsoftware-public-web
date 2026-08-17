<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ArrowRight, MapPin, PawPrint, Plus, Wallet } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import AccountCartPanel from './AccountCartPanel.vue'
import AccountCatalogPanel from './AccountCatalogPanel.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import PetForm from '@/features/dashboard/views/consulta/nueva/components/PetForm.vue'
import FeCustomerPicker from '@/features/facturacion/components/FeCustomerPicker.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useCuentas } from '../composables/useCuentas'
import { useOpenAccountCart } from '../composables/useOpenAccountCart'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials } from '@/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { buildCreateAnimalRequest } from '@/features/dashboard/views/consulta/nueva/api/animal.mapper'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { OpenAccountResponse } from '../types/cuentas'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import type { PetDraft } from '@/features/dashboard/views/consulta/nueva/stores/nuevaConsultaDraft.store'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; created: [account: OpenAccountResponse] }>()

const tienda = useTienda()
const store = useCuentas()
// Carrito de cargos y su cascada idempotente: ver useOpenAccountCart.ts
const {
  cart,
  busy,
  total,
  retryHint,
  addCatalogItem: pushCatalogItem,
  addGeneral,
  lineLabel,
  setQty,
  removeLine,
  reset: resetCart,
  confirm: confirmCart,
} = useOpenAccountCart()
const toast = useToast()
const branchStore = useBranchStore()
const { companyId } = useAuth()

// ── Carrito de cargos a registrar ────────────────────────────────────────────

type PetSel = number | 'general'

const pickedOwner = ref<OwnerResponse | null>(null)
const ownerPets = ref<{ id: number; name: string }[]>([])
const dupAccount = ref<OpenAccountResponse | null>(null)

const selectedPet = ref<PetSel>('general')
const tab = ref<'service' | 'product'>('service')
const query = ref('')

function selectTab(nextTab: 'service' | 'product') {
  tab.value = nextTab
  query.value = ''
}

// ── Marcadores de idempotencia para el reintento de "Abrir cuenta" ───────────
// La cuenta se crea una sola vez y cada cargo (un POST por unidad) se marca al
// persistirse; tras un fallo parcial, reintentar continúa sin duplicar nada.

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
    resetCart()
    selectedPet.value = 'general'
    tab.value = 'service'
    query.value = ''
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
  petCreating.value = false
  petError.value = null
  // Si hubo creación parcial para el dueño anterior, su cuenta persiste en el servidor
  // (aparecerá en la lista); el modal arranca limpio para el nuevo dueño.
  resetCart()
}

// ── Registrar mascota nueva dentro del modal (opcional) ──────────────────────
function defaultPetDraft(): PetDraft {
  return {
    name: '',
    chipNumber: '',
    specieId: '',
    breedId: '',
    gender: '',
    colorId: '',
    bod: '',
    animalType: 'NONE',
    weight: '',
    weightType: 'KILOGRAMS',
    size: '',
    reproductiveState: '',
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
    const payload = buildCreateAnimalRequest(petDraft.value, String(owner.id))
    const created = await animalApi.create(payload)
    ownerPets.value = [...ownerPets.value, { id: created.id, name: created.name }]
    selectedPet.value = created.id
    petCreating.value = false
    toast.success('Mascota registrada', `${created.name} quedó registrada y seleccionada.`)
  } catch (e) {
    petError.value = getProblemDetailMessage(
      e,
      'No se pudo registrar la mascota. Intenta nuevamente.',
    )
  } finally {
    petBusy.value = false
  }
}

const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...tienda.taxes.value.map((t) => ({
    value: String(t.id),
    label: `${t.name} (${t.percentage}%)`,
  })),
])

const isGeneral = computed(() => selectedPet.value === 'general')

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'service') {
    return tienda.services.value
      .filter(
        (s) =>
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.serviceCategory?.name.toLowerCase().includes(q),
      )
      .map((s) => ({ id: s.id, name: s.name, price: s.price, soldOut: false }))
  }
  return (
    tienda.products.value
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.productCategory?.name.toLowerCase().includes(q),
      )
      // Stock por sede (F4): agotado según el saldo de la sede activa si está cargado; si no, no se marca (el backend valida).
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.salePrice,
        soldOut: (tienda.stockByProduct.value[p.id]?.quantity ?? 1) <= 0,
      }))
  )
})

function addCatalogItem(item: { id: number; name: string; price: number; soldOut: boolean }) {
  if (isGeneral.value) return
  const animalId = selectedPet.value as number
  const animalName = ownerPets.value.find((pet) => pet.id === animalId)?.name ?? null
  pushCatalogItem(item, tab.value, animalId, animalName)
}

// Monto libre por diseño (sin catálogo): se permite 0, pero exige un valor
// explícito; la cantidad debe ser entera >= 1.
const canAddGeneral = computed(
  () => general.name.trim().length >= 2 && unitAmountDigits.value !== '' && quantityNum.value >= 1,
)

function addGeneralToCart() {
  if (!canAddGeneral.value) return
  addGeneral({
    name: general.name.trim(),
    unitPrice: unitAmountNum.value,
    qty: quantityNum.value || 1,
    taxId: general.taxId ? Number(general.taxId) : null,
    hasTax: general.taxId !== '',
  })
  Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
}

async function confirm() {
  if (!canConfirm.value || !pickedOwner.value) return
  const fresh = await confirmCart({ id: pickedOwner.value.id, name: pickedOwner.value.name })
  if (!fresh) return
  emit('created', fresh)
  emit('close')
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

function goToExistingAccount(): void {
  if (!dupAccount.value) return
  emit('created', dupAccount.value)
  emit('close')
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
              <button
                type="button"
                class="ds-btn ds-btn--ghost ds-btn--lg"
                @click="cancelCreatePet"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="ds-btn ds-btn--primary ds-btn--lg"
                :disabled="petBusy"
                @click="submitPet"
              >
                <PawPrint :size="15" :stroke-width="1.9" />
                {{ petBusy ? 'Registrando…' : 'Registrar mascota' }}
              </button>
            </div>
          </div>

          <template v-else>
            <!-- Catálogo servicios/productos -->
            <template v-if="!isGeneral">
              <AccountCatalogPanel
                :tab="tab"
                :query="query"
                :items="catalog"
                @update:tab="selectTab"
                @update:query="query = $event"
                @add="addCatalogItem"
              />
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
                    <BaseInput
                      :id="id"
                      v-model="unitAmountDisplay"
                      inputmode="numeric"
                      placeholder="0"
                    />
                  </template>
                </BaseField>
                <BaseField label="Cantidad" required>
                  <template #default="{ id }">
                    <BaseInput
                      :id="id"
                      v-model="quantityDisplay"
                      inputmode="numeric"
                      placeholder="1"
                    />
                  </template>
                </BaseField>
                <BaseField label="Impuesto">
                  <template #default="{ id }">
                    <BaseSelect
                      :id="id"
                      v-model="general.taxId"
                      :options="taxOptions"
                      placeholder="Sin impuesto"
                    />
                  </template>
                </BaseField>
              </div>
              <button
                type="button"
                class="add-btn solid"
                :disabled="!canAddGeneral"
                @click="addGeneralToCart"
              >
                <Plus :size="14" :stroke-width="1.9" /> Agregar al carrito
              </button>
            </div>

            <!-- Panel carrito -->
            <AccountCartPanel
              :lines="cart"
              :line-label="lineLabel"
              @set-qty="setQty"
              @remove="removeLine"
            />

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
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        v-if="dupAccount"
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        @click="goToExistingAccount"
      >
        Ir al detalle de la cuenta <ArrowRight :size="15" :stroke-width="1.9" />
      </button>
      <button
        v-else
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="!canConfirm"
        @click="confirm"
      >
        {{ busy ? 'Abriendo…' : 'Abrir cuenta' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Tarjeta del propietario */
.owner-card {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px;
  margin-bottom: 16px;
  background: var(--warm-100);
  border-radius: 11px;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 500;
  flex-shrink: 0;
}
.who-text {
  min-width: 0;
  flex: 1;
}
.who-text .name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}
.who-text .meta {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 1px;
}
.change {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.dup-warn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 14px;
  border-radius: 10px;
  font-size: var(--text-body);
  background: var(--warning-50);
  border: 1px solid var(--warning-200);

  /* Nota: este tono es propio de `.dup-warn` (hue 70), no el `--warning-fg`
     del sistema (hue 80). Se deja tal cual para no cambiar el aspecto. */
  color: oklch(40% 0.1 70deg);
}
.dup-warn strong {
  font-weight: 600;
}

/* Selector de mascota */
.section {
  margin-bottom: 16px;
}
.label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  font-weight: 500;
  margin-bottom: 8px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
}
.chip.active {
  background: var(--amatista-50);
  border-color: var(--amatista-400);
  color: var(--amatista-700);
  font-weight: 500;
}
.chip.add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--amatista-50);
  border: 1.5px dashed var(--amatista-300);
  color: var(--amatista-700);
  font-weight: 600;
}
.chip.add:hover {
  background: var(--amatista-100);
}

/* Registrar mascota nueva */
.petcreate {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.petcreate-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}
.pet-err {
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  background: var(--danger-100);
  border: 1px solid var(--danger-300);
  color: oklch(48% 0.16 25deg);
}

/* Cargo general */
.general-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--warm-800);
  cursor: pointer;
}
.check input {
  width: 16px;
  height: 16px;
  accent-color: var(--amatista-600);
}

/* Carrito */
.cart {
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-50);
  overflow: hidden;
}

/* Footer */
.foottotal {
  font-size: 13px;
  color: var(--warm-600);
}
.foottotal strong {
  font-size: 15px;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

/* Los botones del footer y del alta de mascota usan `.ds-btn` (primitives.css). */

/* El mismo botón que usa AccountCatalogPanel; aquí lo lleva el cargo general
   con el modificador . Se duplica porque el CSS scoped no cruza
   fronteras de componente. */
.add-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  background: var(--amatista-50);
  color: var(--amatista-700);
  border: 1px solid var(--amatista-200);
}

.add-btn:hover:not(:disabled) {
  background: var(--amatista-100);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-btn.solid {
  background: var(--gradient-primary);
  color: white;
  border: none;
  padding: 9px 16px;
  font-size: 13px;
  align-self: flex-start;
}
</style>

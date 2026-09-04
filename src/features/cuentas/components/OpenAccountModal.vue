<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, MapPin, Plus, Wallet } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import AccountCartPanel from './AccountCartPanel.vue'
import AccountCatalogPanel from './AccountCatalogPanel.vue'
import GeneralChargeForm from './GeneralChargeForm.vue'
import OpenAccountPetForm from './OpenAccountPetForm.vue'
import FeCustomerPicker from '@/features/facturacion/components/FeCustomerPicker.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useCuentas } from '../composables/useCuentas'
import { useOpenAccountCart } from '../composables/useOpenAccountCart'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { initials } from '@/composables/format'
import { animalApi } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import { useBranchStore } from '@/features/branches/stores/branch.store'
import type { OpenAccountResponse } from '../types/cuentas'
import type { OwnerResponse } from '@/features/dashboard/views/consulta/nueva/types/owner.types'

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
const branchStore = useBranchStore()

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
  // Si hubo creación parcial para el dueño anterior, su cuenta persiste en el servidor
  // (aparecerá en la lista); el modal arranca limpio para el nuevo dueño.
  resetCart()
}

// ── Registrar mascota nueva dentro del modal (opcional) ──────────────────────
// El formulario vive en `OpenAccountPetForm`, montado con `v-if`: su borrador
// arranca limpio en cada apertura sin resetearlo desde aquí.
const petCreating = ref(false)

function startCreatePet() {
  petCreating.value = true
}

function onPetCreated(pet: { id: number; name: string }) {
  ownerPets.value = [...ownerPets.value, pet]
  selectedPet.value = pet.id
  petCreating.value = false
}

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
          <span class="avatar ds-tone--accent">{{ initials(pickedOwner.name) }}</span>
          <div class="who-text ds-flex-fill">
            <div class="ds-item-label ds-item-label--lg">{{ pickedOwner.name }}</div>
            <div class="meta ds-meta">{{ pickedOwner.document }} · {{ pickedOwner.phone }}</div>
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
            <div class="ds-wrap-row">
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
          <OpenAccountPetForm
            v-if="petCreating"
            :owner-id="pickedOwner.id"
            @created="onPetCreated"
            @cancel="petCreating = false"
          />

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
            <GeneralChargeForm v-else @add="addGeneral" />

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
      <span v-if="pickedOwner && !dupAccount && cart.length" class="foottotal ds-meta-dark">
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
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 500;
  flex-shrink: 0;
}
.who-text .meta {
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
  border: 1px solid var(--warning-border);

  /* Nota: este tono es propio de `.dup-warn` (hue 70), no el `--warning-fg`
     del sistema (hue 80). Se deja tal cual para no cambiar el aspecto. */
  color: var(--warning-900);
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
.chip {
  padding: 7px 14px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: var(--warm-100);
  border: 1px solid var(--warm-450);
  color: var(--warm-700);
}

/* A11Y-09: `--amatista-400` daba 2,74:1 sobre el `--amatista-50` del chip
   activo — incumple, y encima por debajo del chip inactivo (`--warm-450` sobre
   `--warm-100`, 3,33:1): el seleccionado se veía menos. `--amatista-500` da
   4,17:1. */
.chip.active {
  background: var(--amatista-50);
  border-color: var(--amatista-500);
  color: var(--amatista-700);
  font-weight: 500;
}
.chip.add {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--amatista-50);

  /* A11Y-09: discontinuo o no, es la frontera del control. `--amatista-300`
     daba 1,87:1 en reposo y 1,70:1 con el relleno del hover; `--amatista-500`
     da 4,17:1 y 3,80:1. */
  border: 1.5px dashed var(--amatista-500);
  color: var(--amatista-700);
  font-weight: 600;
}
.chip.add:hover {
  background: var(--amatista-100);
}

/* El alta de mascota vive en `OpenAccountPetForm.vue` y el cargo libre en
   `GeneralChargeForm.vue`, cada uno con su propio CSS. */

/* Footer */
.foottotal strong {
  font-size: 15px;
  color: var(--amatista-700);
  font-variant-numeric: tabular-nums;
  margin-left: 4px;
}

/* Los botones del footer usan `.ds-btn` (primitives.css). */
</style>

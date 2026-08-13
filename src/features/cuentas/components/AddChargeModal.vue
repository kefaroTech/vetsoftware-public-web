<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Plus, Search } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import { useTienda } from '@/features/tienda/composables/useTienda'
import { useCuentas } from '../composables/useCuentas'
import { formatMoney } from '@/features/tienda/composables/pricing'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  open: boolean
  accountId: number
  /** Mascotas del propietario de la cuenta. */
  pets: { id: number; name: string }[]
}>()

const emit = defineEmits<{ close: []; added: []; refresh: [] }>()

const tienda = useTienda()
const cuentas = useCuentas()
const toast = useToast()

type PetSel = number | 'general'
const selectedPet = ref<PetSel>('general')
const tab = ref<'service' | 'product'>('service')
const query = ref('')
const busy = ref(false)

// Cargo general
const general = reactive({ name: '', unitAmount: '', quantity: '1', taxId: '' })

// Cantidad por producto del catálogo (entero >= 1). Mismo saneo por dígitos que el cargo general.
// Solo aplica a la pestaña "Productos": el POST product-charge-open-accounts acepta `quantity`.
const qtyById = reactive<Record<number, string>>({})
function qtyStr(id: number): string {
  return qtyById[id] ?? '1'
}
function setQty(id: number, v: string): void {
  qtyById[id] = v.replace(/\D/g, '')
}
function qtyNum(id: number): number {
  return Number(qtyStr(id).replace(/\D/g, '')) || 0
}
function resetQtys(): void {
  for (const k of Object.keys(qtyById)) Reflect.deleteProperty(qtyById, Number(k))
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    tienda.ensureLoaded()
    selectedPet.value = props.pets[0]?.id ?? 'general'
    tab.value = 'service'
    query.value = ''
    resetQtys()
    Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
  },
)

const taxOptions = computed(() => [
  { value: '', label: 'Sin impuesto' },
  ...tienda.taxes.value.map((t) => ({
    value: String(t.id),
    label: `${t.name} (${t.percentage}%)`,
  })),
])

const catalog = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (tab.value === 'service') {
    return tienda.services.value
      .filter((s) => !q || s.name.toLowerCase().includes(q))
      .map((s) => ({ id: s.id, name: s.name, price: s.price }))
  }
  return tienda.products.value
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .map((p) => ({ id: p.id, name: p.name, price: p.salePrice }))
})

const isGeneral = computed(() => selectedPet.value === 'general')

async function addCatalogItem(itemId: number) {
  if (isGeneral.value || busy.value) return
  // Producto: la cantidad va en el POST (>= 1). Servicio: siempre 1 unidad.
  const qty = tab.value === 'product' ? qtyNum(itemId) : 1
  if (tab.value === 'product' && qty < 1) return
  busy.value = true
  try {
    const animalId = selectedPet.value as number
    // Idempotency key por click: si el POST se reintenta (respuesta perdida), el backend no duplica el cargo.
    const reqId = crypto.randomUUID()
    if (tab.value === 'service')
      await cuentas.addServiceCharge(props.accountId, animalId, itemId, reqId)
    else {
      await cuentas.addProductCharge(props.accountId, animalId, itemId, qty, reqId)
      Reflect.deleteProperty(qtyById, itemId)
    }
    toast.success('Cargo agregado', 'Se añadió a la cuenta.')
    emit('added')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
      emit('refresh')
    } else {
      toast.errorFrom('Ocurrió un error', e, 'No se pudo agregar el cargo')
    }
  } finally {
    busy.value = false
  }
}

// COP en enteros: se descartan no-dígitos (incl. separador de miles) en el valor unitario y se fuerza la
// cantidad a un entero. Evita `Number("1.500") === 1.5`, cantidades negativas/cero (crédito encubierto) y
// fracciones que antes pasaban vía `Number("2.5")`.
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
const canAddGeneral = computed(
  // Monto libre por diseño (sin catálogo): se permite 0, pero exige un valor explícito; la cantidad debe ser entera >= 1.
  () => general.name.trim().length >= 2 && unitAmountDigits.value !== '' && quantityNum.value >= 1,
)

async function addGeneral() {
  if (!canAddGeneral.value || busy.value) return
  busy.value = true
  try {
    await cuentas.addGeneralCharge({
      name: general.name.trim(),
      unitAmount: unitAmountNum.value,
      quantity: quantityNum.value,
      taxId: general.taxId ? Number(general.taxId) : null,
      hasTax: general.taxId !== '',
      openAccountId: props.accountId,
      clientRequestId: crypto.randomUUID(),
    })
    toast.success('Cargo agregado', 'Cargo general añadido a la cuenta.')
    Object.assign(general, { name: '', unitAmount: '', quantity: '1', taxId: '' })
    emit('added')
  } catch (e) {
    if (isConcurrencyConflict(e)) {
      toast.warn('Conflicto de concurrencia', getProblemDetailMessage(e))
      emit('refresh')
    } else {
      toast.errorFrom('Ocurrió un error', e, 'No se pudo agregar el cargo')
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    title="Agregar cargo"
    subtitle="Selecciona la mascota y los ítems a cobrar"
    :icon="Plus"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div class="section">
        <div class="label">¿Para cuál mascota?</div>
        <div class="chips">
          <button
            v-for="p in pets"
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

      <template v-if="!isGeneral">
        <div class="tabs">
          <button
            type="button"
            class="tab"
            :class="{ active: tab === 'service' }"
            @click="tab = 'service'"
          >
            Servicios
          </button>
          <button
            type="button"
            class="tab"
            :class="{ active: tab === 'product' }"
            @click="tab = 'product'"
          >
            Productos
          </button>
        </div>
        <div class="search">
          <Search :size="14" :stroke-width="1.7" class="s-icon" />
          <input v-model="query" type="text" class="s-input" placeholder="Buscar…" />
        </div>
        <ul class="catalog">
          <li v-for="it in catalog" :key="it.id" class="cat-row">
            <span class="cat-name">{{ it.name }}</span>
            <span class="cat-price">
              {{ formatMoney(it.price) }}
              <span v-if="tab === 'product' && qtyNum(it.id) > 1" class="cat-sub">
                · {{ formatMoney(it.price * qtyNum(it.id)) }}
              </span>
            </span>
            <input
              v-if="tab === 'product'"
              class="qty-input"
              :class="{ invalid: qtyNum(it.id) < 1 }"
              type="text"
              inputmode="numeric"
              aria-label="Cantidad"
              :value="qtyStr(it.id)"
              @input="setQty(it.id, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="add-btn"
              :disabled="busy || (tab === 'product' && qtyNum(it.id) < 1)"
              @click="addCatalogItem(it.id)"
            >
              <Plus :size="14" :stroke-width="1.9" /> Agregar
            </button>
          </li>
          <li v-if="catalog.length === 0" class="ds-empty ds-empty--tight">
            No hay ítems en este catálogo.
          </li>
        </ul>
      </template>

      <div v-else class="general-form">
        <BaseField label="Concepto" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="general.name" placeholder="Ej. Insumo, recargo…" />
          </template>
        </BaseField>
        <div class="grid">
          <BaseField label="Valor unitario (IVA incl.)" required>
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="unitAmountDisplay"
                inputmode="numeric"
                placeholder="$0"
              />
            </template>
          </BaseField>
          <BaseField label="Cantidad" required>
            <template #default="{ id }">
              <BaseInput :id="id" v-model="quantityDisplay" inputmode="numeric" placeholder="1" />
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
          :disabled="!canAddGeneral || busy"
          @click="addGeneral"
        >
          <Plus :size="14" :stroke-width="1.9" /> Agregar cargo general
        </button>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Listo
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
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
.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--warm-200);
  margin-bottom: 12px;
}

.tab {
  padding: 8px 14px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  background: transparent;
  border: none;
  color: var(--warm-600);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab.active {
  color: var(--amatista-700);
  border-bottom-color: var(--amatista-700);
  font-weight: 500;
}
.search {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}
.s-icon {
  position: absolute;
  left: 13px;
  color: var(--warm-500);
}

.s-input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px 10px 38px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}
.s-input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.catalog {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  transition:
    border-color 0.12s,
    background 0.12s;
}
.cat-row:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}
.cat-name {
  flex: 1;
  font-size: 13.5px;
  color: var(--warm-900);
}
.cat-price {
  font-size: 13px;
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}
.cat-sub {
  color: var(--amatista-700);
  font-weight: 500;
}

.qty-input {
  width: 46px;
  text-align: center;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-800);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 6px 0;
  outline: none;
  background: var(--warm-50);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.qty-input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.qty-input.invalid {
  border-color: oklch(60% 0.18 25deg);
  box-shadow: 0 0 0 3px var(--danger-100);
}

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
.general-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
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
</style>

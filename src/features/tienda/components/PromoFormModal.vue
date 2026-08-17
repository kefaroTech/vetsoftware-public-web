<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BadgePercent } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import DateInput from '@/components/ui/DateInput.vue'
import { getProblemDetailMessage } from '@/services/http/http.client'
import { todayISO } from '@/composables/format'
import { useTienda } from '../composables/useTienda'
import type {
  ApplicationType,
  PromotionPayload,
  PromotionResponse,
  PromotionType,
  ValueType,
} from '../types/tienda'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  initial: PromotionResponse | null
}>()

const emit = defineEmits<{
  close: []
  saved: [item: PromotionResponse]
}>()

const store = useTienda()

interface Draft {
  name: string
  promotionType: PromotionType
  applicationType: ApplicationType
  applicationItem: string
  valueType: ValueType
  value: string
  startDate: string
  endDate: string
  active: boolean
}

function emptyDraft(): Draft {
  return {
    name: '',
    promotionType: 'DISCOUNT',
    applicationType: 'PRODUCT',
    applicationItem: '',
    valueType: 'PERCENTAGE',
    value: '',
    startDate: todayISO(),
    endDate: todayISO(),
    active: true,
  }
}

const draft = reactive<Draft>(emptyDraft())
const submitted = ref(false)
const busy = ref(false)
const saveError = ref<string | null>(null)

const isEdit = computed(() => props.initial !== null)

const PROMO_TYPE_OPTIONS = [
  { value: 'DISCOUNT', label: 'Descuento' },
  { value: 'SPECIAL_PRICE', label: 'Precio especial' },
]
const APPLICATION_OPTIONS = [
  { value: 'PRODUCT', label: 'Producto' },
  { value: 'SERVICE', label: 'Servicio' },
  { value: 'CATEGORY', label: 'Categoría' },
]
const VALUE_TYPE_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Porcentaje (%)' },
  { value: 'VALUE', label: 'Monto fijo ($)' },
]

const applicationItemOptions = computed(() => {
  if (draft.applicationType === 'PRODUCT') {
    return store.products.value.map((p) => ({ value: String(p.id), label: p.name }))
  }
  if (draft.applicationType === 'SERVICE') {
    return store.services.value.map((s) => ({ value: String(s.id), label: s.name }))
  }
  // CATEGORY: el backend solo guarda un Long; mostramos categorías de producto y de servicio.
  return [
    ...store.productCategories.value.map((c) => ({
      value: String(c.id),
      label: `Producto · ${c.name}`,
    })),
    ...store.serviceCategories.value.map((c) => ({
      value: String(c.id),
      label: `Servicio · ${c.name}`,
    })),
  ]
})

const isSpecialPrice = computed(() => draft.promotionType === 'SPECIAL_PRICE')

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    saveError.value = null
    const it = props.initial
    if (it) {
      Object.assign(draft, {
        name: it.name,
        promotionType: it.promotionType,
        applicationType: it.applicationType,
        applicationItem: String(it.applicationItem),
        valueType: it.valueType,
        value: String(it.value),
        startDate: it.startDate.slice(0, 10),
        endDate: it.endDate.slice(0, 10),
        active: it.promotionStatus === 'ACTIVE',
      } satisfies Draft)
    } else {
      Object.assign(draft, emptyDraft())
    }
  },
)

// Al cambiar el destino, limpia el ítem seleccionado.
watch(
  () => draft.applicationType,
  () => {
    draft.applicationItem = ''
  },
)

function num(v: string): number {
  return Number(String(v).replace(',', '.'))
}

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Mínimo 2 caracteres' : null,
  applicationItem: !draft.applicationItem ? 'Selecciona el destino de la promoción' : null,
  value: !(num(draft.value) >= 0) ? 'Número ≥ 0' : null,
  endDate: draft.endDate < draft.startDate ? 'Debe ser posterior al inicio' : null,
}))

function err(field: string): string | undefined {
  return submitted.value
    ? ((errors.value as Record<string, string | null>)[field] ?? undefined)
    : undefined
}

const isValid = computed(() => Object.values(errors.value).every((e) => e === null))

async function submit() {
  submitted.value = true
  if (!isValid.value || busy.value) {
    scrollToFirstError()
    return
  }
  busy.value = true
  saveError.value = null
  const payload: PromotionPayload = {
    name: draft.name.trim(),
    promotionType: draft.promotionType,
    applicationType: draft.applicationType,
    applicationItem: Number(draft.applicationItem),
    valueType: isSpecialPrice.value ? 'VALUE' : draft.valueType,
    value: num(draft.value),
    startDate: `${draft.startDate}T00:00:00`,
    endDate: `${draft.endDate}T23:59:59`,
    promotionStatus: draft.active ? 'ACTIVE' : 'INACTIVE',
  }
  try {
    const saved = props.initial
      ? await store.updatePromotion(props.initial.id, payload)
      : await store.createPromotion(payload)
    emit('saved', saved)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar la promoción')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="isEdit ? 'Editar promoción' : 'Nueva promoción'"
    subtitle="Descuento o precio especial sobre un producto, servicio o categoría"
    :icon="BadgePercent"
    :width="640"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="saveError" class="ds-banner ds-banner--error">{{ saveError }}</div>
      <div class="grid">
        <BaseField label="Nombre" required :error="err('name')" class="ds-grid-span">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              :invalid="!!err('name')"
              placeholder="Promo dermatológica"
            />
          </template>
        </BaseField>
        <BaseField label="Tipo de promoción" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.promotionType" :options="PROMO_TYPE_OPTIONS" />
          </template>
        </BaseField>
        <BaseField label="Aplica a" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.applicationType" :options="APPLICATION_OPTIONS" />
          </template>
        </BaseField>
        <BaseField label="Destino" required :error="err('applicationItem')" class="ds-grid-span">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.applicationItem"
              :options="applicationItemOptions"
              :invalid="!!err('applicationItem')"
              placeholder="Selecciona…"
            />
          </template>
        </BaseField>
        <BaseField v-if="!isSpecialPrice" label="Tipo de valor" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.valueType" :options="VALUE_TYPE_OPTIONS" />
          </template>
        </BaseField>
        <BaseField
          :label="
            isSpecialPrice
              ? 'Precio especial'
              : draft.valueType === 'PERCENTAGE'
                ? 'Porcentaje de descuento'
                : 'Monto de descuento'
          "
          required
          :error="err('value')"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.value"
              :invalid="!!err('value')"
              inputmode="decimal"
              placeholder="0"
            />
          </template>
        </BaseField>
        <BaseField label="Inicio" required>
          <DateInput v-model="draft.startDate" />
        </BaseField>
        <BaseField label="Fin" required :error="err('endDate')">
          <DateInput v-model="draft.endDate" :invalid="!!err('endDate')" />
        </BaseField>
        <label class="check ds-grid-span">
          <input v-model="draft.active" type="checkbox" />
          <span>Promoción activa</span>
        </label>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--lg" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--primary ds-btn--lg"
        :disabled="busy"
        @click="submit"
      >
        {{ busy ? 'Guardando…' : 'Guardar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 20px;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
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

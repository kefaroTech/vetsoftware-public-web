<script setup lang="ts">
import { computed, reactive, toRef, watch } from 'vue'
import { PawPrint, Scale, IdCard, TriangleAlert } from 'lucide-vue-next'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SegmentedRadio from '@/features/dashboard/components/ui/SegmentedRadio.vue'
import { useSpecies } from '../composables/useSpecies'
import { useBreedsBySpecie } from '../composables/useBreedsBySpecie'
import { useAnimalColors } from '../composables/useAnimalColors'
import { weightUnitLabel } from '../composables/format'
import type { PetDraft } from '../composables/useNuevaConsultaDraft'

const props = defineProps<{ modelValue: PetDraft }>()
defineEmits<{ 'update:modelValue': [value: PetDraft] }>()

const draft = computed(() => props.modelValue)

const { options: speciesOptions, loading: loadingSpecies, error: speciesError } =
  useSpecies()

const specieIdRef = toRef(() => props.modelValue.specieId)
const {
  options: breedOptions,
  loading: loadingBreeds,
  error: breedsError,
} = useBreedsBySpecie(specieIdRef)

const {
  options: colorOptions,
  loading: loadingColors,
  error: colorsError,
} = useAnimalColors()

watch(specieIdRef, (val, prev) => {
  if (val !== prev) draft.value.breedId = ''
})

const genderOptions = [
  { value: 'FEMALE', label: 'Hembra' },
  { value: 'MALE', label: 'Macho' },
]

const animalTypeOptions = [
  { value: 'NONE', label: 'Ninguno' },
  { value: 'SERVICE', label: 'De servicio' },
  { value: 'SUPPORT', label: 'De apoyo emocional' },
]

const weightUnitOptions = [
  { value: 'KILOGRAMS', label: 'Kilogramos' },
  { value: 'GRAMS', label: 'Gramos' },
  { value: 'POUNDS', label: 'Libras' },
]

const reproductiveOptions = [
  { value: 'STERILIZED', label: 'Esterilizada' },
  { value: 'NO_STERILIZED', label: 'No esterilizada' },
  { value: 'UNKNOWN', label: 'Desconocido' },
]

type FieldKey =
  | 'name'
  | 'chipNumber'
  | 'specieId'
  | 'breedId'
  | 'colorId'
  | 'gender'
  | 'bod'
  | 'weight'
  | 'size'
  | 'reproductiveState'

const touched = reactive<Record<FieldKey, boolean>>({
  name: false,
  chipNumber: false,
  specieId: false,
  breedId: false,
  colorId: false,
  gender: false,
  bod: false,
  weight: false,
  size: false,
  reproductiveState: false,
})

function validateName(v: string): string | null {
  if (!v.trim()) return 'El nombre es obligatorio.'
  if (v.trim().length < 2) return 'Debe tener al menos 2 caracteres.'
  return null
}
function validateChipNumber(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  if (!/^\d+$/.test(t)) return 'Solo se permiten dígitos.'
  if (t.length !== 15) return 'Debe tener exactamente 15 dígitos (ISO 11784).'
  return null
}
function validateBod(v: string): string | null {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return 'Fecha inválida.'
  if (d.getTime() > Date.now()) return 'No puede ser una fecha futura.'
  return null
}
function validateWeight(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n)) return 'Debe ser un número válido.'
  if (n <= 0) return 'Debe ser mayor que 0.'
  if (n > 2000) return 'Valor demasiado grande.'
  return null
}
function validateSize(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t.replace(',', '.'))
  if (!Number.isFinite(n)) return 'Debe ser un número válido.'
  if (n <= 0) return 'Debe ser mayor que 0.'
  if (n > 500) return 'Valor demasiado grande.'
  return null
}
function validateRequired(v: string, label: string): string | null {
  if (!v) return `${label} es obligatorio.`
  return null
}

const errors = computed(() => ({
  name: validateName(draft.value.name),
  chipNumber: validateChipNumber(draft.value.chipNumber),
  specieId: validateRequired(draft.value.specieId, 'La especie'),
  breedId: validateRequired(draft.value.breedId, 'La raza'),
  colorId: validateRequired(draft.value.colorId, 'El color'),
  gender: validateRequired(draft.value.gender, 'El género'),
  bod: validateBod(draft.value.bod),
  weight: validateWeight(draft.value.weight),
  size: validateSize(draft.value.size),
  reproductiveState: validateRequired(
    draft.value.reproductiveState,
    'El estado reproductivo',
  ),
}))

function err(field: FieldKey): string | undefined {
  return touched[field] && errors.value[field] ? errors.value[field]! : undefined
}

function markTouched(field: FieldKey) {
  touched[field] = true
}

function sanitizeChip(v: string): string {
  return v.replace(/\D/g, '').slice(0, 15)
}
function sanitizeNumeric(v: string): string {
  return v.replace(/[^\d.,]/g, '')
}

const chipModel = computed({
  get: () => draft.value.chipNumber,
  set: (v) => {
    draft.value.chipNumber = sanitizeChip(v)
  },
})
const weightModel = computed({
  get: () => draft.value.weight,
  set: (v) => {
    draft.value.weight = sanitizeNumeric(v)
  },
})
const sizeModel = computed({
  get: () => draft.value.size,
  set: (v) => {
    draft.value.size = sanitizeNumeric(v)
  },
})

function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  return (Object.keys(errors.value) as FieldKey[]).every(
    (k) => !errors.value[k],
  )
}

defineExpose({ validate })
</script>

<template>
  <div class="form">
    <div
      v-if="speciesError || breedsError || colorsError"
      class="catalog-error"
    >
      <TriangleAlert :size="13" :stroke-width="1.7" />
      <span>{{ speciesError ?? breedsError ?? colorsError }}</span>
    </div>

    <SectionCard accent :icon="PawPrint" title="Identificación">
      <div class="grid-2">
        <BaseField label="Nombre" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              placeholder="Ej. Mishi"
              :icon="PawPrint"
              :invalid="!!err('name')"
              @blur="markTouched('name')"
            />
          </template>
        </BaseField>
        <BaseField
          label="Número de chip"
          hint="Opcional · 15 dígitos del microchip (ISO 11784)"
          :error="err('chipNumber')"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="chipModel"
              placeholder="Ej. 985112345678901"
              :icon="IdCard"
              inputmode="numeric"
              :invalid="!!err('chipNumber')"
              @blur="markTouched('chipNumber')"
            />
          </template>
        </BaseField>
        <BaseField label="Especie" required :error="err('specieId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.specieId"
              :options="speciesOptions"
              :placeholder="
                loadingSpecies ? 'Cargando…' : 'Selecciona especie'
              "
              :disabled="loadingSpecies"
              :invalid="!!err('specieId')"
              @blur="markTouched('specieId')"
            />
          </template>
        </BaseField>
        <BaseField label="Raza" required :error="err('breedId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.breedId"
              :options="breedOptions"
              :placeholder="
                loadingBreeds
                  ? 'Cargando…'
                  : draft.specieId
                    ? 'Selecciona raza'
                    : 'Primero elige una especie'
              "
              :disabled="!draft.specieId || loadingBreeds"
              :invalid="!!err('breedId')"
              @blur="markTouched('breedId')"
            />
          </template>
        </BaseField>
        <BaseField label="Género" required :error="err('gender')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.gender"
              :options="genderOptions"
              placeholder="Selecciona género"
              :invalid="!!err('gender')"
              @blur="markTouched('gender')"
            />
          </template>
        </BaseField>
        <BaseField label="Color" required :error="err('colorId')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.colorId"
              :options="colorOptions"
              :placeholder="
                loadingColors ? 'Cargando…' : 'Selecciona color'
              "
              :disabled="loadingColors"
              :invalid="!!err('colorId')"
              @blur="markTouched('colorId')"
            />
          </template>
        </BaseField>
        <BaseField
          label="Fecha de nacimiento"
          hint="Aproximada si no se conoce con exactitud"
          :error="err('bod')"
        >
          <template #default="{ id }">
            <DateInput
              :id="id"
              v-model="draft.bod"
              :invalid="!!err('bod')"
              @blur="markTouched('bod')"
            />
          </template>
        </BaseField>
        <BaseField label="Tipo">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.animalType"
              :options="animalTypeOptions"
              placeholder="Selecciona tipo"
            />
          </template>
        </BaseField>
      </div>
    </SectionCard>

    <SectionCard :icon="Scale" title="Características físicas y reproductivas">
      <div class="grid-3">
        <BaseField label="Peso" hint="Opcional" :error="err('weight')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="weightModel"
              placeholder="Ej. 4.2"
              inputmode="decimal"
              :suffix="weightUnitLabel(draft.weightType)"
              :invalid="!!err('weight')"
              @blur="markTouched('weight')"
            />
          </template>
        </BaseField>
        <BaseField label="Unidad de peso">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.weightType"
              :options="weightUnitOptions"
            />
          </template>
        </BaseField>
        <BaseField label="Tamaño (cm)" hint="Altura a la cruz" :error="err('size')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="sizeModel"
              placeholder="Ej. 28"
              inputmode="decimal"
              :invalid="!!err('size')"
              @blur="markTouched('size')"
            />
          </template>
        </BaseField>
      </div>
      <BaseField
        label="Estado reproductivo"
        required
        :error="err('reproductiveState')"
      >
        <SegmentedRadio
          v-model="draft.reproductiveState"
          :options="reproductiveOptions"
          :invalid="!!err('reproductiveState')"
        />
      </BaseField>
    </SectionCard>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.catalog-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  padding: 10px 14px;
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
  border-radius: 10px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 28px;
}
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px 28px;
  margin-bottom: 22px;
}
@media (max-width: 980px) {
  .grid-3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 640px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
</style>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { PawPrint, Scale, IdCard } from 'lucide-vue-next'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SegmentedRadio from '@/features/dashboard/components/ui/SegmentedRadio.vue'
import { species, breeds } from '../data/species'
import type { PetDraft } from '../composables/useNuevaConsultaDraft'

const props = defineProps<{ modelValue: PetDraft }>()
defineEmits<{ 'update:modelValue': [value: PetDraft] }>()

const draft = computed(() => props.modelValue)

const speciesOptions = species.map((s) => ({ value: s.id, label: s.name }))

const breedOptions = computed(() =>
  breeds
    .filter((b) => b.specieId === draft.value.specieId)
    .map((b) => ({ value: b.id, label: b.name })),
)

watch(
  () => draft.value.specieId,
  (val, prev) => {
    if (val !== prev) draft.value.breedId = ''
  },
)

const genderOptions = [
  { value: 'F', label: 'Hembra' },
  { value: 'M', label: 'Macho' },
]

const animalTypeOptions = [
  { value: 'pet', label: 'Mascota común' },
  { value: 'farm', label: 'Animal de granja' },
  { value: 'exotic', label: 'Exótico' },
]

const weightUnitOptions = [
  { value: 'kg', label: 'Kilogramos' },
  { value: 'g', label: 'Gramos' },
  { value: 'lb', label: 'Libras' },
]

const reproductiveOptions = [
  { value: 'sterilized', label: 'Esterilizada' },
  { value: 'unsterilized', label: 'No esterilizada' },
  { value: 'unknown', label: 'Desconocido' },
]
</script>

<template>
  <div class="form">
    <SectionCard accent :icon="PawPrint" title="Identificación">
      <div class="grid-2">
        <BaseField label="Nombre" required>
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              placeholder="Ej. Mishi"
              :icon="PawPrint"
            />
          </template>
        </BaseField>
        <BaseField label="Código" hint="Se autogenera si lo dejas vacío">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.code"
              placeholder="VTR-0247"
              :icon="IdCard"
            />
          </template>
        </BaseField>
        <BaseField label="Especie" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.specieId"
              :options="speciesOptions"
              placeholder="Selecciona especie"
            />
          </template>
        </BaseField>
        <BaseField label="Raza" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.breedId"
              :options="breedOptions"
              :placeholder="
                draft.specieId
                  ? 'Selecciona raza'
                  : 'Primero elige una especie'
              "
              :disabled="!draft.specieId"
            />
          </template>
        </BaseField>
        <BaseField label="Género" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.gender"
              :options="genderOptions"
              placeholder="Selecciona género"
            />
          </template>
        </BaseField>
        <BaseField label="Color">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.color"
              placeholder="Ej. Atigrado, blanco"
            />
          </template>
        </BaseField>
        <BaseField
          label="Fecha de nacimiento"
          required
          hint="Aproximada si no se conoce con exactitud"
        >
          <template #default="{ id }">
            <DateInput :id="id" v-model="draft.bod" />
          </template>
        </BaseField>
        <BaseField label="Tipo">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.animalType"
              :options="animalTypeOptions"
              placeholder="Mascota común"
            />
          </template>
        </BaseField>
      </div>
    </SectionCard>

    <SectionCard :icon="Scale" title="Características físicas y reproductivas">
      <div class="grid-3">
        <BaseField label="Peso" required>
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.weight"
              placeholder="Ej. 4.2"
              type="number"
              :suffix="draft.weightType"
            />
          </template>
        </BaseField>
        <BaseField label="Unidad de peso" required>
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.weightType"
              :options="weightUnitOptions"
            />
          </template>
        </BaseField>
        <BaseField label="Tamaño (cm)" hint="Altura a la cruz">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.size"
              placeholder="Ej. 28"
              type="number"
            />
          </template>
        </BaseField>
      </div>
      <BaseField label="Estado reproductivo" required>
        <SegmentedRadio
          v-model="draft.reproductiveState"
          :options="reproductiveOptions"
        />
      </BaseField>
    </SectionCard>
  </div>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
.grid-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 720px) {
  .grid-2,
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
</style>

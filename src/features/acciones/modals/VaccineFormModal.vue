<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Syringe } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { useVaccinationTypes } from '@/features/vaccination-types/composables/useVaccinationTypes'
import { todayISO } from '@/composables/format'
import { vaccinationApi } from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'
import type { VaccinationResponse } from '@/features/dashboard/views/consulta/nueva/types/vaccination.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: VaccinationResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: VaccinationResponse]
}>()

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createType,
} = useVaccinationTypes()

function plusOneYear(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const next = new Date(y + 1, (m ?? 1) - 1, d ?? 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`
}

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  typeId: '',
  lot: '',
  notes: '',
  nextVaccination: plusOneYear(todayISO()),
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.typeId = String(props.initial.vaccinationType.id)
    draft.lot = props.initial.lot
    draft.notes = props.initial.notes
    draft.nextVaccination = props.initial.nextVaccination ?? ''
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    const today = todayISO()
    draft.date = today
    draft.typeId = ''
    draft.lot = ''
    draft.notes = ''
    draft.nextVaccination = plusOneYear(today)
  }
  submitted.value = false
  saveError.value = null
}

watch(
  () => props.open,
  (open) => {
    if (open) reset()
  },
)

const errors = computed(() => ({
  patient: patientId.value == null ? 'Selecciona un paciente' : null,
  typeId: !draft.typeId ? 'Selecciona el tipo de vacuna' : null,
  lot: !draft.lot.trim() ? 'Indica el lote' : null,
}))

const valid = computed(() => !errors.value.patient && !errors.value.typeId && !errors.value.lot)

function err(field: keyof typeof errors.value): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
}

async function onCreateType(data: { name: string; description: string }) {
  const created = await createType(data)
  return {
    value: String(created.id),
    label: created.name,
    hint: created.description ?? undefined,
  }
}

async function save() {
  submitted.value = true
  if (!valid.value || saving.value) {
    scrollToFirstError()
    return
  }
  const pid = patientId.value
  if (pid == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  saving.value = true
  saveError.value = null
  const payload = {
    date: draft.date,
    vaccinationTypeId: Number(draft.typeId),
    lot: draft.lot.trim(),
    notes: draft.notes.trim(),
    nextVaccination: draft.nextVaccination || null,
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
  }
  try {
    const result = props.initial
      ? await vaccinationApi.update(props.initial.id, payload)
      : await vaccinationApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar la vacunación')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Syringe"
    :title="isEdit ? 'Editar vacunación' : 'Nueva vacunación'"
    :subtitle="
      isEdit
        ? 'Modifica los datos de la aplicación'
        : 'Registra una aplicación independiente de una consulta'
    "
    :width="820"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="ds-banner ds-banner--sm ds-banner--error">{{ typesError }}</div>
      <div v-if="saveError" class="ds-banner ds-banner--sm ds-banner--error">{{ saveError }}</div>

      <BaseField
        v-if="!preSelectedAnimal && !isEdit"
        label="Paciente"
        required
        :error="err('patient')"
      >
        <PatientCascadePicker v-model="patientId" :invalid="!!err('patient')" />
      </BaseField>
      <PatientFixedCard v-else :summary="initial?.animal" :animal="preSelectedAnimal" />

      <div class="ds-grid-2 form-grid">
        <BaseField label="Fecha de aplicación" required>
          <DateInput v-model="draft.date" />
        </BaseField>
        <BaseField label="Tipo de vacuna" required :error="err('typeId')">
          <SearchableSelect
            v-model="draft.typeId"
            :options="typeOptions"
            :loading="loadingTypes"
            :invalid="!!err('typeId')"
            placeholder="Selecciona o crea"
            :on-create="onCreateType"
            create-label="Crear tipo de vacuna"
          />
        </BaseField>
        <BaseField label="Lote" required :error="err('lot')">
          <BaseInput v-model="draft.lot" :invalid="!!err('lot')" />
        </BaseField>
        <BaseField label="Próxima aplicación">
          <DateInput v-model="draft.nextVaccination" />
        </BaseField>
        <BaseField label="Notas" class="ds-grid-span">
          <BaseTextarea
            v-model="draft.notes"
            :rows="2"
            placeholder="Reacciones, vía de aplicación, indicaciones…"
          />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="saving"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--snug"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar vacunación' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Solo el hueco superior y el corte a 1 columna: el resto de la rejilla
   (columnas y gap) lo pone `.ds-grid-2`. El corte propio va a 760px, no a los
   640px de la primitiva, porque estos formularios viven en un modal de 820px. */
.form-grid {
  margin-top: 14px;
}

@media (width <= 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

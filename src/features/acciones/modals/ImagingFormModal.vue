<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ScanLine } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useDiagnosticImagingTypes } from '@/features/diagnostic-imaging-types/composables/useDiagnosticImagingTypes'
import { todayISO } from '@/composables/format'
import { diagnosticImagingApi } from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import type { DiagnosticImagingResponse } from '@/features/dashboard/views/consulta/nueva/types/diagnosticImaging.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: DiagnosticImagingResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: DiagnosticImagingResponse]
}>()

const { companyId } = useAuth()
const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createType,
} = useDiagnosticImagingTypes()

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  typeId: '',
  studyType: '',
  clinicalSigns: '',
  diagnosis: '',
  observations: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.typeId = String(props.initial.diagnosticImagingType.id)
    draft.studyType = props.initial.studyType
    draft.clinicalSigns = props.initial.clinicalSigns
    draft.diagnosis = props.initial.diagnosis
    draft.observations = props.initial.observations
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.typeId = ''
    draft.studyType = ''
    draft.clinicalSigns = ''
    draft.diagnosis = ''
    draft.observations = ''
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
  typeId: !draft.typeId ? 'Selecciona el tipo de estudio' : null,
  studyType: !draft.studyType.trim() ? 'Indica la región / protocolo' : null,
  clinicalSigns: !draft.clinicalSigns.trim() ? 'Describe los signos clínicos' : null,
  diagnosis: !draft.diagnosis.trim() ? 'Indica el diagnóstico' : null,
}))

const valid = computed(
  () =>
    !errors.value.patient &&
    !errors.value.typeId &&
    !errors.value.studyType &&
    !errors.value.clinicalSigns &&
    !errors.value.diagnosis,
)

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
  const cid = companyId.value
  const pid = patientId.value
  if (cid == null || pid == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  saving.value = true
  saveError.value = null
  const payload = {
    date: draft.date,
    diagnosticImagingTypeId: Number(draft.typeId),
    clinicalSigns: draft.clinicalSigns.trim(),
    studyType: draft.studyType.trim(),
    diagnosis: draft.diagnosis.trim(),
    observations: draft.observations.trim(),
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
    companyId: cid,
  }
  try {
    const result = props.initial
      ? await diagnosticImagingApi.update(props.initial.id, payload)
      : await diagnosticImagingApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el estudio')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="ScanLine"
    :title="isEdit ? 'Editar estudio de imagen diagnóstica' : 'Nuevo estudio de imagen diagnóstica'"
    :subtitle="
      isEdit ? 'Modifica los datos del estudio' : 'Crea un estudio independiente de una consulta'
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
        <BaseField label="Fecha" required>
          <DateInput v-model="draft.date" />
        </BaseField>
        <BaseField label="Tipo de estudio" required :error="err('typeId')">
          <SearchableSelect
            v-model="draft.typeId"
            :options="typeOptions"
            :loading="loadingTypes"
            :invalid="!!err('typeId')"
            placeholder="Rayos X, Eco, TAC…"
            :on-create="onCreateType"
            create-label="Crear tipo de imagen"
          />
        </BaseField>
        <BaseField label="Región / protocolo" required :error="err('studyType')">
          <BaseInput
            v-model="draft.studyType"
            :invalid="!!err('studyType')"
            placeholder="Ej. tórax lateral"
          />
        </BaseField>
        <BaseField
          label="Signos clínicos"
          required
          :error="err('clinicalSigns')"
          class="ds-grid-span"
        >
          <BaseTextarea
            v-model="draft.clinicalSigns"
            :rows="2"
            :invalid="!!err('clinicalSigns')"
            placeholder="Razón clínica del estudio"
          />
        </BaseField>
        <BaseField label="Diagnóstico" required :error="err('diagnosis')" class="ds-grid-span">
          <BaseTextarea v-model="draft.diagnosis" :rows="2" :invalid="!!err('diagnosis')" />
        </BaseField>
        <BaseField label="Observaciones" class="ds-grid-span">
          <BaseTextarea v-model="draft.observations" :rows="2" />
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar estudio' }}
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

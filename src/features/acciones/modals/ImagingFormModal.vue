<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { PawPrint, ScanLine } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useDiagnosticImagingTypes } from '@/features/diagnostic-imaging-types/composables/useDiagnosticImagingTypes'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { diagnosticImagingApi } from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import type { DiagnosticImagingResponse } from '@/features/dashboard/views/consulta/nueva/types/diagnosticImaging.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'

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
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar el estudio'
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
      <div v-else-if="isEdit && initial" class="patient-fixed">
        <div class="paw"><PawPrint :size="14" :stroke-width="1.7" /></div>
        <div class="info">
          <div class="name">{{ initial.animal.name }}</div>
          <div class="meta">{{ initial.animal.code }}</div>
        </div>
      </div>
      <div v-else-if="preSelectedAnimal" class="patient-fixed">
        <div class="paw"><PawPrint :size="14" :stroke-width="1.7" /></div>
        <div class="info">
          <div class="name">{{ preSelectedAnimal.name }}</div>
          <div class="meta">
            {{ preSelectedAnimal.specie.name }} · {{ preSelectedAnimal.breed.name }}
            <span v-if="preSelectedAnimal.owner"> · {{ preSelectedAnimal.owner.name }}</span>
          </div>
        </div>
      </div>

      <div class="grid">
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
        <BaseField label="Signos clínicos" required :error="err('clinicalSigns')" class="full">
          <BaseTextarea
            v-model="draft.clinicalSigns"
            :rows="2"
            :invalid="!!err('clinicalSigns')"
            placeholder="Razón clínica del estudio"
          />
        </BaseField>
        <BaseField label="Diagnóstico" required :error="err('diagnosis')" class="full">
          <BaseTextarea v-model="draft.diagnosis" :rows="2" :invalid="!!err('diagnosis')" />
        </BaseField>
        <BaseField label="Observaciones" class="full">
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
.patient-fixed {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  padding: 10px 12px;
}

.patient-fixed .paw {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
}

.patient-fixed .name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.patient-fixed .meta {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 2px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
  margin-top: 14px;
}

.grid .full {
  grid-column: 1 / -1;
}

@media (width <= 760px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { PawPrint, ScanLine } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SearchableSelect from '@/features/dashboard/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useDiagnosticImagingTypes } from '@/features/dashboard/views/consulta/nueva/composables/useDiagnosticImagingTypes'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import {
  diagnosticImagingApi,
  type DiagnosticImagingResponse,
} from '@/features/dashboard/views/consulta/nueva/api/diagnosticImaging.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'

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
  return submitted.value ? errors.value[field] ?? undefined : undefined
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
  if (!valid.value || saving.value) return
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
    saveError.value =
      e instanceof Error ? e.message : 'No se pudo guardar el estudio'
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
    :subtitle="isEdit ? 'Modifica los datos del estudio' : 'Crea un estudio independiente de una consulta'"
    :width="820"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="typesError" class="banner error">{{ typesError }}</div>
      <div v-if="saveError" class="banner error">{{ saveError }}</div>

      <BaseField v-if="!preSelectedAnimal && !isEdit" label="Paciente" required :error="err('patient')">
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
          <BaseTextarea
            v-model="draft.diagnosis"
            :rows="2"
            :invalid="!!err('diagnosis')"
          />
        </BaseField>
        <BaseField label="Observaciones" class="full">
          <BaseTextarea v-model="draft.observations" :rows="2" />
        </BaseField>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" :disabled="saving" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="btn-primary" :disabled="saving" @click="save">
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar estudio' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12.5px;
  margin-bottom: 12px;
}
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
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-700);
}
.btn-ghost:hover:not(:disabled) { background: var(--warm-100); }
.btn-primary {
  background: var(--amatista-700);
  color: white;
}
.btn-primary:hover:not(:disabled) { filter: brightness(1.05); }
.btn-primary:disabled,
.btn-ghost:disabled { opacity: 0.55; cursor: not-allowed; }
</style>

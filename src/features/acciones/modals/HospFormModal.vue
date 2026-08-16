<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BedDouble, PawPrint } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import SegmentedRadio from '@/features/dashboard/components/ui/SegmentedRadio.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { hospitalizationApi } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { HospitalizationType, ReasonLeaving } from '@/types/domain'
import { scrollToFirstError } from '@/composables/scrollToError'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: HospitalizationResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: HospitalizationResponse]
}>()

const { companyId } = useAuth()

const typeOptions = [
  { value: 'HOSPITALIZATION', label: 'Hospitalización' },
  { value: 'OUTPATIENT', label: 'Ambulatoria' },
]
const reasonLeavingOptions = [
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Deseo del tutor' },
  { value: 'DEATH', label: 'Fallecimiento' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
]

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  startDate: todayISO(),
  endDate: '',
  type: 'HOSPITALIZATION' as HospitalizationType,
  reasonLeaving: '' as ReasonLeaving | '',
  reason: '',
  observations: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.startDate = props.initial.startDate
    draft.endDate = props.initial.endDate ?? ''
    draft.type = props.initial.type
    draft.reasonLeaving = (props.initial.reasonLeaving ?? '') as ReasonLeaving | ''
    draft.reason = props.initial.reason
    draft.observations = props.initial.observations
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    const today = todayISO()
    draft.date = today
    draft.startDate = today
    draft.endDate = ''
    draft.type = 'HOSPITALIZATION'
    draft.reasonLeaving = ''
    draft.reason = ''
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
  reason: !draft.reason.trim() ? 'Indica la razón de ingreso' : null,
}))

const valid = computed(() => !errors.value.patient && !errors.value.reason)

function err(field: keyof typeof errors.value): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
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
    startDate: draft.startDate,
    endDate: draft.endDate || null,
    type: draft.type,
    reasonLeaving: (draft.reasonLeaving || null) as ReasonLeaving | null,
    reason: draft.reason.trim(),
    observations: draft.observations.trim(),
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
    companyId: cid,
  }
  try {
    const result = props.initial
      ? await hospitalizationApi.update(props.initial.id, payload)
      : await hospitalizationApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar la hospitalización'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="BedDouble"
    :title="isEdit ? 'Editar hospitalización' : 'Nueva hospitalización'"
    :subtitle="
      isEdit
        ? 'Modifica los datos del ingreso'
        : 'Registra un ingreso independiente de una consulta'
    "
    :width="820"
    @close="emit('close')"
  >
    <template #body>
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
        <BaseField label="Tipo" required class="full">
          <SegmentedRadio v-model="draft.type" :options="typeOptions" />
        </BaseField>
        <BaseField label="Fecha de registro" required>
          <DateInput v-model="draft.date" />
        </BaseField>
        <BaseField label="Inicio" required>
          <DateInput v-model="draft.startDate" />
        </BaseField>
        <BaseField label="Fin">
          <DateInput v-model="draft.endDate" />
        </BaseField>
        <BaseField label="Motivo de alta">
          <BaseSelect
            v-model="draft.reasonLeaving"
            :options="reasonLeavingOptions"
            placeholder="Sin alta aún"
          />
        </BaseField>
        <BaseField label="Razón de ingreso" required :error="err('reason')" class="full">
          <BaseTextarea v-model="draft.reason" :rows="2" :invalid="!!err('reason')" />
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar hospitalización' }}
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

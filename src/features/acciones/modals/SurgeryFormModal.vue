<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Scissors } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { useSurgeryTypes } from '@/features/surgery-types/composables/useSurgeryTypes'
import { todayISO } from '@/composables/format'
import { surgeryApi } from '@/features/dashboard/views/consulta/nueva/api/surgery.api'
import type { SurgeryResponse } from '@/features/dashboard/views/consulta/nueva/types/surgery.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: SurgeryResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: SurgeryResponse]
}>()

const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createType,
} = useSurgeryTypes()

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  surgeryTypeId: '',
  description: '',
  medicament: '',
  observations: '',
  complications: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.surgeryTypeId = String(props.initial.surgeryType.id)
    draft.description = props.initial.description
    draft.medicament = props.initial.medicament
    draft.observations = props.initial.observations
    draft.complications = props.initial.complications
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.surgeryTypeId = ''
    draft.description = ''
    draft.medicament = ''
    draft.observations = ''
    draft.complications = ''
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
  surgeryTypeId: !draft.surgeryTypeId ? 'Selecciona el tipo de cirugía' : null,
  description: !draft.description.trim() ? 'Describe el procedimiento' : null,
}))

const valid = computed(
  () => !errors.value.patient && !errors.value.surgeryTypeId && !errors.value.description,
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
  const pid = patientId.value
  if (pid == null) {
    saveError.value = 'Faltan datos para guardar.'
    return
  }
  saving.value = true
  saveError.value = null
  const payload = {
    date: draft.date,
    surgeryTypeId: Number(draft.surgeryTypeId),
    description: draft.description.trim(),
    medicament: draft.medicament.trim(),
    observations: draft.observations.trim(),
    complications: draft.complications.trim(),
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
  }
  try {
    const result = props.initial
      ? await surgeryApi.update(props.initial.id, payload)
      : await surgeryApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar la cirugía')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Scissors"
    :title="isEdit ? 'Editar cirugía' : 'Nueva cirugía'"
    :subtitle="
      isEdit
        ? 'Modifica los datos del procedimiento'
        : 'Registra una cirugía independiente de una consulta'
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
        <BaseField label="Tipo de cirugía" required :error="err('surgeryTypeId')">
          <SearchableSelect
            v-model="draft.surgeryTypeId"
            :options="typeOptions"
            :loading="loadingTypes"
            :invalid="!!err('surgeryTypeId')"
            placeholder="Selecciona o crea"
            :on-create="onCreateType"
            create-label="Crear tipo de cirugía"
          />
        </BaseField>
        <BaseField
          label="Descripción del procedimiento"
          required
          :error="err('description')"
          class="ds-grid-span"
        >
          <BaseTextarea
            v-model="draft.description"
            :rows="2"
            :invalid="!!err('description')"
            placeholder="Detalle del procedimiento, técnica, abordaje…"
          />
        </BaseField>
        <BaseField label="Medicamentos" hint="Protocolo y dosis" class="ds-grid-span">
          <BaseTextarea
            v-model="draft.medicament"
            :rows="2"
            placeholder="Ej. Acepromacina 0,05 mg/kg + Propofol"
          />
        </BaseField>
        <BaseField label="Observaciones" class="ds-grid-span">
          <BaseTextarea
            v-model="draft.observations"
            :rows="2"
            placeholder="Cuidados pre/postoperatorios, antibiótico…"
          />
        </BaseField>
        <!-- La instrucción va al `hint`, que persiste mientras se escribe (R16.5). -->
        <BaseField
          label="Complicaciones"
          hint="Si hubo complicaciones intra o post-operatorias"
          class="ds-grid-span"
        >
          <BaseTextarea
            v-model="draft.complications"
            :rows="2"
            placeholder="Sangrado, reacción anestésica, dehiscencia…"
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar cirugía' }}
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

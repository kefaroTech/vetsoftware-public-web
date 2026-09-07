<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Home } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { todayISO } from '@/composables/format'
import { daycareApi } from '@/features/dashboard/views/consulta/nueva/api/daycare.api'
import type { DayCareResponse } from '@/features/dashboard/views/consulta/nueva/types/daycare.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: DayCareResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: DayCareResponse]
}>()

const typeOptions = [
  { value: 'DAYCARE', label: 'Guardería' },
  { value: 'HOTEL', label: 'Hotel' },
]

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  startDate: todayISO(),
  endDate: '',
  type: 'DAYCARE' as 'DAYCARE' | 'HOTEL',
  objects: '',
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
    draft.objects = props.initial.objects ?? ''
    draft.observations = props.initial.observations ?? ''
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.startDate = todayISO()
    draft.endDate = ''
    draft.type = 'DAYCARE'
    draft.objects = ''
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
  endDate:
    draft.endDate && draft.endDate < draft.startDate
      ? 'Debe ser igual o posterior a la entrada'
      : null,
}))

const valid = computed(() => !errors.value.patient && !errors.value.endDate)

function err(field: keyof typeof errors.value): string | undefined {
  return submitted.value ? (errors.value[field] ?? undefined) : undefined
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
    startDate: draft.startDate,
    endDate: draft.endDate || undefined,
    type: draft.type,
    objects: draft.objects.trim() || undefined,
    observations: draft.observations.trim() || undefined,
    animalId: pid,
  }
  try {
    const result = props.initial
      ? await daycareApi.update(props.initial.id, payload)
      : await daycareApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el registro')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Home"
    :title="isEdit ? 'Editar guardería' : 'Nuevo registro de guardería'"
    :subtitle="
      isEdit
        ? 'Modifica los datos de la estadía'
        : 'Registra una estadía de guardería u hotel para el paciente'
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
      <PatientFixedCard v-else :summary="initial?.animal" :animal="preSelectedAnimal" />

      <div class="ds-grid-2 form-grid">
        <BaseField label="Tipo" required>
          <BaseSelect
            v-model="draft.type"
            :options="typeOptions"
            placeholder="Selecciona el tipo"
          />
        </BaseField>
        <BaseField label="Fecha de entrada" required>
          <DateInput v-model="draft.startDate" />
        </BaseField>
        <BaseField
          label="Fecha de salida"
          hint="Opcional · si ya se conoce"
          :error="err('endDate')"
        >
          <DateInput v-model="draft.endDate" :min="draft.startDate" :invalid="!!err('endDate')" />
        </BaseField>
        <BaseField label="Objetos que trae" hint="Opcional" class="ds-grid-span">
          <BaseInput v-model="draft.objects" placeholder="Correa, cama, juguetes…" />
        </BaseField>
        <BaseField label="Observaciones" hint="Opcional" class="ds-grid-span">
          <BaseTextarea
            v-model="draft.observations"
            :rows="2"
            placeholder="Comportamiento, dieta, indicaciones…"
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar registro' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.form-grid {
  margin-top: 14px;
}

@media (width <= 760px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>

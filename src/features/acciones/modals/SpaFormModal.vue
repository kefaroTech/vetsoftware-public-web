<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useSpaTypes } from '@/features/spa-types/composables/useSpaTypes'
import { todayISO } from '@/composables/format'
import { spaApi } from '@/features/dashboard/views/consulta/nueva/api/spa.api'
import type { SpaResponse } from '@/features/dashboard/views/consulta/nueva/types/spa.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: SpaResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: SpaResponse]
}>()

const { companyId } = useAuth()
const {
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  create: createType,
} = useSpaTypes()

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  typeId: '',
  reason: '',
  details: '',
  observations: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.typeId = String(props.initial.spaType.id)
    draft.reason = props.initial.reason
    draft.details = props.initial.details
    draft.observations = props.initial.observations
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.typeId = ''
    draft.reason = ''
    draft.details = ''
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
  typeId: !draft.typeId ? 'Selecciona el tipo de servicio' : null,
  reason: !draft.reason.trim() ? 'Indica el motivo' : null,
  details: !draft.details.trim() ? 'Indica los detalles' : null,
  observations: !draft.observations.trim() ? 'Indica las observaciones' : null,
}))

const valid = computed(
  () =>
    !errors.value.patient &&
    !errors.value.typeId &&
    !errors.value.reason &&
    !errors.value.details &&
    !errors.value.observations,
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
    spaTypeId: Number(draft.typeId),
    reason: draft.reason.trim(),
    details: draft.details.trim(),
    observations: draft.observations.trim(),
    animalId: pid,
    companyId: cid,
  }
  try {
    const result = props.initial
      ? await spaApi.update(props.initial.id, payload)
      : await spaApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar el servicio')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Sparkles"
    :title="isEdit ? 'Editar servicio de spa' : 'Nuevo servicio de spa'"
    :subtitle="
      isEdit ? 'Modifica los datos del servicio' : 'Registra un servicio de spa para el paciente'
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
        <BaseField label="Tipo de servicio" required :error="err('typeId')">
          <SearchableSelect
            v-model="draft.typeId"
            :options="typeOptions"
            :loading="loadingTypes"
            :invalid="!!err('typeId')"
            placeholder="Selecciona o crea"
            :on-create="onCreateType"
            create-label="Crear tipo de servicio"
          />
        </BaseField>
        <BaseField label="Motivo" required :error="err('reason')" class="ds-grid-span">
          <BaseInput
            v-model="draft.reason"
            :invalid="!!err('reason')"
            placeholder="Mantenimiento mensual, Dermatitis, etc."
          />
        </BaseField>
        <BaseField label="Detalles" required :error="err('details')" class="ds-grid-span">
          <BaseTextarea
            v-model="draft.details"
            :rows="2"
            :invalid="!!err('details')"
            placeholder="Productos, técnica, tiempos"
          />
        </BaseField>
        <BaseField label="Observaciones" required :error="err('observations')" class="ds-grid-span">
          <BaseTextarea v-model="draft.observations" :rows="2" :invalid="!!err('observations')" />
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar servicio' }}
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

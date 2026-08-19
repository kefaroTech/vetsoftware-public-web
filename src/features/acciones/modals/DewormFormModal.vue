<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Bug } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import BaseField from '@/components/ui/BaseField.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseTextarea from '@/components/ui/BaseTextarea.vue'
import DateInput from '@/components/ui/DateInput.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import PatientFixedCard from '../components/PatientFixedCard.vue'
import { useAuth } from '@/features/auth/composables/useAuth'
import { todayISO } from '@/composables/format'
import { dewormingApi } from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
import type { DewormingResponse } from '@/features/dashboard/views/consulta/nueva/types/deworming.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { DewormingType } from '@/types/domain'
import { scrollToFirstError } from '@/composables/scrollToError'
import { getProblemDetailMessage } from '@/services/http/http.client'

const props = defineProps<{
  open: boolean
  preSelectedAnimal?: AnimalResponse | null
  initial?: DewormingResponse | null
}>()
const emit = defineEmits<{
  close: []
  saved: [item: DewormingResponse]
}>()

const { companyId } = useAuth()

const typeOptions = [
  { value: 'INTERNAL', label: 'Interna' },
  { value: 'EXTERNAL', label: 'Externa' },
  { value: 'MIX', label: 'Mixta' },
  { value: 'OTHER', label: 'Otra' },
]

const isEdit = computed(() => props.initial != null)

const patientId = ref<number | null>(null)
const draft = reactive({
  date: todayISO(),
  lastDeworming: '',
  type: 'INTERNAL' as DewormingType,
  product: '',
  dosage: '',
  nextControl: '',
  observations: '',
})
const submitted = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)

function reset() {
  if (props.initial) {
    patientId.value = props.initial.animal.id
    draft.date = props.initial.date
    draft.lastDeworming = props.initial.lastDeworming ?? ''
    draft.type = props.initial.type
    draft.product = props.initial.product
    draft.dosage = props.initial.dosage
    draft.nextControl = props.initial.nextControl ?? ''
    draft.observations = props.initial.observations
  } else {
    patientId.value = props.preSelectedAnimal?.id ?? null
    draft.date = todayISO()
    draft.lastDeworming = ''
    draft.type = 'INTERNAL'
    draft.product = ''
    draft.dosage = ''
    draft.nextControl = ''
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
  product: !draft.product.trim() ? 'Indica el producto' : null,
  dosage: !draft.dosage.trim() ? 'Indica la dosis' : null,
}))

const valid = computed(() => !errors.value.patient && !errors.value.product && !errors.value.dosage)

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
    lastDeworming: draft.lastDeworming || null,
    type: draft.type,
    product: draft.product.trim(),
    dosage: draft.dosage.trim(),
    nextControl: draft.nextControl || null,
    observations: draft.observations.trim(),
    animalId: pid,
    consultationId: props.initial?.consultation?.id ?? null,
    companyId: cid,
  }
  try {
    const result = props.initial
      ? await dewormingApi.update(props.initial.id, payload)
      : await dewormingApi.create(payload)
    emit('saved', result)
    emit('close')
  } catch (e) {
    saveError.value = getProblemDetailMessage(e, 'No se pudo guardar la desparasitación')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Bug"
    :title="isEdit ? 'Editar desparasitación' : 'Nueva desparasitación'"
    :subtitle="
      isEdit
        ? 'Modifica los datos del registro'
        : 'Registra una desparasitación independiente de una consulta'
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
        <BaseField label="Fecha" required>
          <DateInput v-model="draft.date" />
        </BaseField>
        <BaseField label="Tipo" required>
          <BaseSelect v-model="draft.type" :options="typeOptions" />
        </BaseField>
        <BaseField label="Producto" required :error="err('product')">
          <BaseInput v-model="draft.product" :invalid="!!err('product')" />
        </BaseField>
        <BaseField label="Dosis" required :error="err('dosage')">
          <BaseInput
            v-model="draft.dosage"
            :invalid="!!err('dosage')"
            placeholder="Ej. 1 ml/10 kg"
          />
        </BaseField>
        <BaseField label="Última desparasitación">
          <DateInput v-model="draft.lastDeworming" />
        </BaseField>
        <BaseField label="Próximo control">
          <DateInput v-model="draft.nextControl" />
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
        {{ saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Guardar desparasitación' }}
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

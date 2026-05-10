<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BedDouble } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import type {
  Animal,
  Hospitalization,
  HospitalizationType,
  ReasonLeaving,
} from '@/types/domain'
import { todayISO, formatDateLong } from '../composables/format'

const props = defineProps<{
  open: boolean
  pet: Animal | null
}>()

const emit = defineEmits<{
  save: [item: Hospitalization]
  close: []
}>()

const typeOptions = [
  { value: 'OUTPATIENT', label: 'Ambulatoria' },
  { value: 'HOSPITALIZATION', label: 'Hospitalización' },
]

const reasonLeavingOptions = [
  { value: '', label: 'Aún no aplica' },
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Decisión del tutor' },
  { value: 'ADMIN', label: 'Administrativa' },
  { value: 'DEATH', label: 'Muerte' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
]

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

watch(
  () => props.open,
  (open) => {
    if (open) {
      Object.assign(draft, {
        date: todayISO(),
        startDate: todayISO(),
        endDate: '',
        type: 'HOSPITALIZATION',
        reasonLeaving: '',
        reason: '',
        observations: '',
      })
      submitted.value = false
    }
  },
)

const subtitle = computed(() => {
  const p = props.pet
  const head = p ? `${p.name} · ${p.specie?.name ?? ''}` : ''
  return `${head ? head + ' · ' : ''}Hoy, ${formatDateLong(draft.date)}`
})

const errors = computed(() => ({
  type: !draft.type ? 'Selecciona el tipo' : null,
  reason:
    draft.reason.trim().length < 4 ? 'Indica el motivo (mínimo 4 caracteres)' : null,
  endDate:
    draft.endDate && draft.endDate < draft.startDate
      ? 'Debe ser igual o posterior al ingreso'
      : null,
}))

const valid = computed<boolean>(
  () => !errors.value.type && !errors.value.reason && !errors.value.endDate,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  if (!submitted.value) return undefined
  return errors.value[k] ?? undefined
}

function save() {
  submitted.value = true
  if (!valid.value) return
  const item: Hospitalization = {
    date: draft.date,
    startDate: draft.startDate,
    endDate: draft.endDate,
    type: draft.type,
    reasonLeaving: draft.reasonLeaving,
    reason: draft.reason.trim(),
    observations: draft.observations.trim(),
  }
  emit('save', item)
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="BedDouble"
    title="Hospitalización"
    :subtitle="subtitle"
    :width="1080"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid-2">
        <BaseField label="Tipo" required :error="err('type')">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.type"
              :options="typeOptions"
              placeholder="Selecciona el tipo"
              :invalid="!!err('type')"
            />
          </template>
        </BaseField>
        <BaseField label="Fecha de ingreso" required>
          <template #default>
            <DateInput v-model="draft.startDate" />
          </template>
        </BaseField>
        <BaseField
          label="Fecha de alta"
          hint="Opcional · si ya fue dado de alta"
          :error="err('endDate')"
        >
          <template #default>
            <DateInput
              v-model="draft.endDate"
              :min="draft.startDate"
              :invalid="!!err('endDate')"
            />
          </template>
        </BaseField>
        <BaseField label="Motivo del alta" hint="Si aplica">
          <template #default="{ id }">
            <BaseSelect
              :id="id"
              v-model="draft.reasonLeaving"
              :options="reasonLeavingOptions"
            />
          </template>
        </BaseField>
      </div>

      <BaseField label="Motivo de hospitalización" required :error="err('reason')">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.reason"
            :rows="3"
            placeholder="Ej. Gastroenteritis hemorrágica con deshidratación severa"
          />
        </template>
      </BaseField>

      <BaseField label="Observaciones">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.observations"
            :rows="3"
            placeholder="Plan terapéutico, monitoreo, indicaciones…"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-left>
      <span>1 hospitalización · Se vinculará a la consulta</span>
    </template>
    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">
        Cancelar
      </button>
      <button
        type="button"
        class="btn-primary"
        :disabled="submitted && !valid"
        @click="save"
      >
        Guardar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 720px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover {
  background: var(--warm-100);
}
.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

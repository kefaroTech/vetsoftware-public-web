<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Pill, Activity } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import SegmentedRadio from '@/features/dashboard/components/ui/SegmentedRadio.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import {
  FREQUENCY_LABEL,
  GUIDELINE_LABEL,
  DURATION_LABEL,
  type OrderKind,
  type OrderVM,
} from '../types/hospital'
import type {
  MedicationFrequency,
  GuidelineType,
  DurationMeasure,
} from '@/types/domain'
import type { CreateHospitalizationMedicationPayload } from '../api/hospitalizationMedication.api'

type OrderPayload = Omit<CreateHospitalizationMedicationPayload, 'hospitalizationId'>

const props = defineProps<{
  open: boolean
  kind: OrderKind
  initial: OrderVM | null
}>()

const emit = defineEmits<{
  save: [payload: OrderPayload]
  close: []
}>()

const isMed = computed(() => props.kind === 'med')
const isEdit = computed(() => props.initial !== null)

const frequencyOptions = (Object.keys(FREQUENCY_LABEL) as MedicationFrequency[]).map(
  (v) => ({ value: v, label: FREQUENCY_LABEL[v] }),
)
const guidelineOptions = (Object.keys(GUIDELINE_LABEL) as GuidelineType[]).map((v) => ({
  value: v,
  label: GUIDELINE_LABEL[v],
}))
const durationOptions = (Object.keys(DURATION_LABEL) as DurationMeasure[]).map((v) => ({
  value: v,
  label: v === 'DAYS' ? 'Por días' : v === 'DOSES' ? 'Por tomas' : 'Indefinida',
}))

const draft = reactive({
  name: '',
  dose: '',
  frequency: 'EVERY_8H' as MedicationFrequency,
  guidelineType: 'FIXED' as GuidelineType,
  durationMeasure: 'DAYS' as DurationMeasure,
  durationQuantity: '' as string,
  startDate: todayISO(),
  startTime: '08:00',
  notes: '',
})
const submitted = ref(false)

function resetDraft() {
  Object.assign(draft, {
    name: '',
    dose: '',
    frequency: 'EVERY_8H',
    guidelineType: 'FIXED',
    durationMeasure: 'DAYS',
    durationQuantity: '',
    startDate: todayISO(),
    startTime: '08:00',
    notes: '',
  })
  submitted.value = false
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    submitted.value = false
    const it = props.initial
    if (it) {
      Object.assign(draft, {
        name: it.name,
        dose: it.dose ?? '',
        frequency: it.frequency ?? 'EVERY_8H',
        guidelineType: it.guidelineType ?? 'FIXED',
        durationMeasure: it.durationMeasure ?? 'DAYS',
        durationQuantity: it.durationQuantity != null ? String(it.durationQuantity) : '',
        startDate: it.startDate ?? todayISO(),
        startTime: (it.startTime ?? '08:00').slice(0, 5),
        notes: it.notes ?? '',
      })
    } else {
      resetDraft()
    }
  },
)

const needsQuantity = computed(() => draft.durationMeasure !== 'INDEFINITE')
const isDiscrete = computed(
  () => draft.frequency !== 'CONTINUOUS' && draft.frequency !== 'SINGLE',
)

const errors = computed(() => ({
  name: draft.name.trim().length < 2 ? 'Indica el nombre' : null,
  dose: isMed.value && draft.dose.trim().length < 1 ? 'Indica la dosis' : null,
  durationQuantity:
    needsQuantity.value && !(Number(draft.durationQuantity) > 0)
      ? 'Indica un número mayor a 0'
      : null,
}))

const valid = computed(
  () => !errors.value.name && !errors.value.dose && !errors.value.durationQuantity,
)

function err<K extends keyof typeof errors.value>(k: K): string | undefined {
  return submitted.value ? (errors.value[k] ?? undefined) : undefined
}

const guidelineHelp = computed(() =>
  draft.guidelineType === 'INTERVAL'
    ? 'Cada toma se cuenta desde la administración real de la anterior. Al aplicar tarde, las tomas pendientes se recalculan sumando el intervalo.'
    : 'Las tomas se mantienen en horas de reloj. Aplicar una toma tarde no mueve las siguientes.',
)

function save() {
  submitted.value = true
  if (!valid.value) return
  emit('save', {
    name: draft.name.trim(),
    dose: isMed.value ? draft.dose.trim() || null : null,
    frequency: draft.frequency,
    guidelineType: draft.guidelineType,
    durationMeasure: draft.durationMeasure,
    durationQuantity: needsQuantity.value ? Number(draft.durationQuantity) : null,
    startDate: draft.startDate,
    startTime: draft.startTime,
    notes: draft.notes.trim() || null,
  })
}
</script>

<template>
  <ModalShell
    :open="open"
    :icon="isMed ? Pill : Activity"
    :title="
      isEdit
        ? isMed
          ? 'Editar medicamento'
          : 'Editar procedimiento'
        : isMed
          ? 'Añadir medicamento'
          : 'Añadir procedimiento'
    "
    :subtitle="isMed ? 'Orden de medicación del plan de tratamiento' : 'Procedimiento o control programado'"
    :width="760"
    @close="emit('close')"
  >
    <template #body>
      <div class="grid-2">
        <BaseField label="Nombre" required :error="err('name')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.name"
              :invalid="!!err('name')"
              :placeholder="isMed ? 'Ej. Cefazolina' : 'Ej. Control de diuresis'"
            />
          </template>
        </BaseField>
        <BaseField v-if="isMed" label="Dosis" required :error="err('dose')">
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.dose"
              :invalid="!!err('dose')"
              placeholder="Ej. 22 mg/kg"
            />
          </template>
        </BaseField>
        <BaseField label="Frecuencia" required>
          <template #default="{ id }">
            <BaseSelect :id="id" v-model="draft.frequency" :options="frequencyOptions" />
          </template>
        </BaseField>
      </div>

      <BaseField label="Pauta" required>
        <template #default>
          <SegmentedRadio v-model="draft.guidelineType" :options="guidelineOptions" />
        </template>
      </BaseField>
      <div class="pauta-help">{{ guidelineHelp }}</div>

      <BaseField label="Duración" required>
        <template #default>
          <SegmentedRadio v-model="draft.durationMeasure" :options="durationOptions" />
        </template>
      </BaseField>
      <div class="grid-2">
        <BaseField
          v-if="needsQuantity"
          :label="draft.durationMeasure === 'DAYS' ? 'Número de días' : 'Número de tomas'"
          required
          :error="err('durationQuantity')"
        >
          <template #default="{ id }">
            <BaseInput
              :id="id"
              v-model="draft.durationQuantity"
              type="number"
              inputmode="numeric"
              :invalid="!!err('durationQuantity')"
              placeholder="Ej. 3"
            />
          </template>
        </BaseField>
        <BaseField label="Fecha de inicio" required>
          <template #default>
            <DateInput v-model="draft.startDate" />
          </template>
        </BaseField>
        <BaseField label="Hora de inicio" required>
          <template #default="{ id }">
            <BaseInput :id="id" v-model="draft.startTime" type="time" />
          </template>
        </BaseField>
      </div>

      <p v-if="!isDiscrete" class="note">
        Las frecuencias «Continua» y «Única» no generan tomas individuales en el
        calendario.
      </p>

      <BaseField label="Notas">
        <template #default="{ id }">
          <BaseTextarea
            :id="id"
            v-model="draft.notes"
            :rows="2"
            placeholder="Diluciones, técnica, indicaciones…"
          />
        </template>
      </BaseField>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="save">
        {{ isEdit ? 'Guardar cambios' : 'Añadir al plan' }}
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
@media (max-width: 640px) {
  .grid-2 { grid-template-columns: 1fr; }
}
.pauta-help {
  margin: -6px 0 16px;
  padding: 9px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--warm-700);
  background: var(--amatista-50);
  border-left: 3px solid var(--amatista-500);
  border-radius: 0 8px 8px 0;
}
.note {
  margin: -4px 0 14px;
  font-size: 12px;
  color: var(--warm-500);
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
.btn-ghost:hover { background: var(--warm-100); }
.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover { filter: brightness(1.05); }
</style>

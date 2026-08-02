<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  Stethoscope,
  ClipboardList,
  TriangleAlert,
  Calendar,
  Sparkles,
  Activity,
} from 'lucide-vue-next'
import ContentWrap from '../components/ContentWrap.vue'
import PageHeading from '../components/PageHeading.vue'
import ContextHeader from '../components/ContextHeader.vue'
import SectionCard from '@/features/dashboard/components/ui/SectionCard.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import BaseInput from '@/features/dashboard/components/ui/BaseInput.vue'
import BaseTextarea from '@/features/dashboard/components/ui/BaseTextarea.vue'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import QuickActionsCard from '../components/QuickActionsCard.vue'
import { scrollToFirstError } from '@/composables/scrollToError'
import { useConsultationTypes } from '../composables/useConsultationTypes'
import { weightUnitLabel } from '../composables/format'
import { useNuevaConsultaDraft, type ActionKind } from '../composables/useNuevaConsultaDraft'
import RecetaModal from '../modals/RecetaModal.vue'
import LabTestModal from '../modals/LabTestModal.vue'
import ImagingModal from '../modals/ImagingModal.vue'
import VaccinationModal from '../modals/VaccinationModal.vue'
import HospitalizationModal from '../modals/HospitalizationModal.vue'
import DewormingModal from '../modals/DewormingModal.vue'
import SurgeryModal from '../modals/SurgeryModal.vue'
import type {
  Deworming,
  DiagnosticImaging,
  Hospitalization,
  LaboratoryTest,
  Prescription,
  Surgery,
  Vaccination,
} from '@/types/domain'

const draft = useNuevaConsultaDraft()
const c = computed(() => draft.state.consultation)
const pet = computed(() => draft.state.pet)

const open = reactive<Record<ActionKind, boolean>>({
  receta: false,
  lab: false,
  imaging: false,
  vaccination: false,
  hospitalization: false,
  deworming: false,
  surgery: false,
})

const counts = computed<Record<ActionKind, number>>(() => ({
  receta: draft.state.prescriptions.length,
  lab: draft.state.laboratoryTests.length,
  imaging: draft.state.diagnosticImagings.length,
  vaccination: draft.state.vaccinations.length,
  hospitalization: draft.state.hospitalizations.length,
  deworming: draft.state.dewormings.length,
  surgery: draft.state.surgeries.length,
}))

function onSelectAction(kind: ActionKind) {
  open[kind] = true
}

function onSavePrescription(p: Prescription) {
  draft.addPrescription(p)
  open.receta = false
}
function onSaveLabTests(items: LaboratoryTest[]) {
  items.forEach((t) => draft.addLaboratoryTest(t))
  open.lab = false
}
function onSaveImaging(item: DiagnosticImaging) {
  draft.addDiagnosticImaging(item)
  open.imaging = false
}
function onSaveVaccinations(items: Vaccination[]) {
  items.forEach((v) => draft.addVaccination(v))
  open.vaccination = false
}
function onSaveHospitalization(item: Hospitalization) {
  draft.addHospitalization(item)
  open.hospitalization = false
}
function onSaveDeworming(item: Deworming) {
  draft.addDeworming(item)
  open.deworming = false
}
function onSaveSurgery(item: Surgery) {
  draft.addSurgery(item)
  open.surgery = false
}

const {
  list: consultationTypesList,
  options: typeOptions,
  loading: loadingTypes,
  error: typesError,
  findById: findConsultationTypeById,
} = useConsultationTypes()

// ── Validación (tipo + fecha + anamnesis son obligatorios) ───────────────────
// Las constantes vitales son OPCIONALES: solo se validan (rango) cuando traen valor.
type FieldKey = 'date' | 'typeId' | 'anamnesis' | 'temperature' | 'heartRate' | 'respiratoryRate'
const touched = reactive<Record<FieldKey, boolean>>({
  date: false,
  typeId: false,
  anamnesis: false,
  temperature: false,
  heartRate: false,
  respiratoryRate: false,
})

function validateDate(v: string): string | null {
  if (!v) return 'La fecha es obligatoria.'
  if (Number.isNaN(new Date(v).getTime())) return 'Fecha inválida.'
  return null
}
function validateType(v: string): string | null {
  return v ? null : 'Selecciona un tipo de consulta.'
}
function validateAnamnesis(v: string): string | null {
  return v.trim() ? null : 'La anamnesis es obligatoria.'
}
// Rango opcional: vacío => válido; con valor => dentro de rango fisiológico.
function validateRange(v: string, min: number, max: number, msg: string): string | null {
  const raw = v.trim().replace(',', '.')
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return 'Valor inválido.'
  if (n < min || n > max) return msg
  return null
}

const errors = computed(() => ({
  date: validateDate(c.value.date),
  typeId: validateType(c.value.typeId),
  anamnesis: validateAnamnesis(c.value.anamnesis),
  temperature: validateRange(c.value.temperature, 0, 60, 'Debe estar entre 0 y 60 °C.'),
  heartRate: validateRange(c.value.heartRate, 0, 1000, 'Debe estar entre 0 y 1000 lpm.'),
  respiratoryRate: validateRange(
    c.value.respiratoryRate,
    0,
    1000,
    'Debe estar entre 0 y 1000 rpm.',
  ),
}))

function err(field: FieldKey): string | undefined {
  return touched[field] ? (errors.value[field] ?? undefined) : undefined
}
function markTouched(field: FieldKey) {
  touched[field] = true
}
function validate(): boolean {
  ;(Object.keys(touched) as FieldKey[]).forEach((k) => (touched[k] = true))
  const ok = (Object.keys(errors.value) as FieldKey[]).every((k) => !errors.value[k])
  if (!ok) scrollToFirstError()
  return ok
}
defineExpose({ validate })

// Peso en consulta: opcional, pero sanitiza en vivo a dígitos + separador decimal.
const weightModel = computed({
  get: () => c.value.weight,
  set: (v) => {
    c.value.weight = v.replace(/[^\d.,]/g, '')
  },
})

// ── Examen físico: sanitizado en vivo (temperatura acepta decimal; FC/FR solo dígitos) ──
const temperatureModel = computed({
  get: () => c.value.temperature,
  set: (v) => {
    c.value.temperature = v.replace(/[^\d.,]/g, '')
  },
})
const heartRateModel = computed({
  get: () => c.value.heartRate,
  set: (v) => {
    c.value.heartRate = v.replace(/\D/g, '')
  },
})
const respiratoryRateModel = computed({
  get: () => c.value.respiratoryRate,
  set: (v) => {
    c.value.respiratoryRate = v.replace(/\D/g, '')
  },
})

// Selects guiados: condición corporal 1–9, escala de dolor 0–10.
const bcsOptions = Array.from({ length: 9 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))
const painOptions = Array.from({ length: 11 }, (_, i) => ({
  value: String(i),
  label: String(i),
}))

watch(
  [() => c.value.typeId, consultationTypesList],
  ([id]) => {
    if (!id) {
      draft.state.consultationType = null
      return
    }
    const found = findConsultationTypeById(id)
    if (found) {
      draft.state.consultationType = { id: String(found.id), name: found.name }
    }
  },
  { immediate: true },
)
</script>

<template>
  <ContentWrap>
    <ContextHeader
      v-if="draft.state.owner && draft.state.pet"
      :owner="draft.state.owner"
      :pet="draft.state.pet"
    />
    <PageHeading
      title="Datos de la consulta"
      subtitle="Solo el tipo y la anamnesis son obligatorios. Lo demás puedes completarlo durante la atención."
    />

    <div v-if="typesError" class="catalog-error">
      <TriangleAlert :size="13" :stroke-width="1.7" />
      <span>{{ typesError }}</span>
    </div>

    <div class="stack">
      <SectionCard accent :icon="Stethoscope" title="Información general">
        <div class="grid-1-2">
          <BaseField label="Fecha" required :error="err('date')">
            <template #default="{ id }">
              <DateInput
                :id="id"
                v-model="c.date"
                :invalid="!!err('date')"
                @blur="markTouched('date')"
              />
            </template>
          </BaseField>
          <BaseField label="Tipo de consulta" required :error="err('typeId')">
            <template #default="{ id }">
              <BaseSelect
                :id="id"
                v-model="c.typeId"
                :options="typeOptions"
                :placeholder="loadingTypes ? 'Cargando…' : 'Selecciona un tipo'"
                :disabled="loadingTypes"
                :invalid="!!err('typeId')"
                @blur="markTouched('typeId')"
              />
            </template>
          </BaseField>
        </div>
        <div class="weight-row">
          <BaseField
            label="Peso en la consulta"
            hint="Opcional · se registra en el historial de peso del paciente"
          >
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="weightModel"
                inputmode="decimal"
                placeholder="Ej. 12.5"
                :suffix="pet ? weightUnitLabel(pet.weightType) : undefined"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <SectionCard
        :icon="ClipboardList"
        title="Anamnesis"
        subtitle="Lo que reporta el dueño · Antecedentes · Obligatorio"
      >
        <BaseTextarea
          v-model="c.anamnesis"
          :rows="4"
          placeholder="Motivo de consulta, signos observados, antecedentes relevantes…"
          :invalid="!!err('anamnesis')"
          @blur="markTouched('anamnesis')"
        />
        <p v-if="err('anamnesis')" class="field-error">
          <TriangleAlert :size="11" :stroke-width="1.8" />
          <span>{{ err('anamnesis') }}</span>
        </p>
      </SectionCard>

      <SectionCard
        :icon="Activity"
        title="Examen físico"
        subtitle="Constantes vitales y hallazgos · Todo opcional"
      >
        <div class="vitals-grid">
          <BaseField label="Temperatura" :error="err('temperature')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="temperatureModel"
                inputmode="decimal"
                placeholder="Ej. 38.5"
                suffix="°C"
                :invalid="!!err('temperature')"
                @blur="markTouched('temperature')"
              />
            </template>
          </BaseField>
          <BaseField label="Frec. cardíaca" :error="err('heartRate')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="heartRateModel"
                inputmode="numeric"
                placeholder="Ej. 90"
                suffix="lpm"
                :invalid="!!err('heartRate')"
                @blur="markTouched('heartRate')"
              />
            </template>
          </BaseField>
          <BaseField label="Frec. respiratoria" :error="err('respiratoryRate')">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="respiratoryRateModel"
                inputmode="numeric"
                placeholder="Ej. 24"
                suffix="rpm"
                :invalid="!!err('respiratoryRate')"
                @blur="markTouched('respiratoryRate')"
              />
            </template>
          </BaseField>
          <BaseField label="Mucosas">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="c.mucousMembranes" placeholder="Ej. rosadas, húmedas" />
            </template>
          </BaseField>
          <BaseField label="Llenado capilar">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="c.capillaryRefill" placeholder="Ej. < 2 s" />
            </template>
          </BaseField>
          <BaseField label="Hidratación">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="c.hydration" placeholder="Ej. normal, 5%" />
            </template>
          </BaseField>
          <BaseField label="Condición corporal" hint="Escala 1–9">
            <template #default="{ id }">
              <BaseSelect
                :id="id"
                v-model="c.bodyConditionScore"
                :options="bcsOptions"
                placeholder="—"
              />
            </template>
          </BaseField>
          <BaseField label="Escala de dolor" hint="0–10">
            <template #default="{ id }">
              <BaseSelect :id="id" v-model="c.painScore" :options="painOptions" placeholder="—" />
            </template>
          </BaseField>
          <BaseField label="Actitud">
            <template #default="{ id }">
              <BaseInput :id="id" v-model="c.attitude" placeholder="Ej. alerta, decaído" />
            </template>
          </BaseField>
        </div>
        <div class="findings-row">
          <BaseField label="Hallazgos al examen">
            <template #default="{ id }">
              <BaseTextarea
                :id="id"
                v-model="c.examFindings"
                :rows="3"
                placeholder="Hallazgos por sistema: cardiorrespiratorio, abdomen, piel, linfonodos…"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <SectionCard
        :icon="TriangleAlert"
        title="Diagnóstico"
        subtitle="Presuntivo o definitivo · Diferenciales · Pronóstico"
      >
        <BaseTextarea
          v-model="c.diagnosis"
          :rows="3"
          placeholder="Diagnóstico presuntivo, diagnósticos diferenciales considerados…"
        />
        <div class="prognosis-row">
          <BaseField label="Pronóstico" hint="Opcional">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="c.prognosis"
                placeholder="Ej. favorable, reservado, grave"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <SectionCard :icon="Calendar" title="Próximo control" subtitle="Opcional">
        <div class="grid-1-2">
          <BaseField label="Fecha sugerida">
            <template #default="{ id }">
              <DateInput :id="id" v-model="c.nextControlDate" />
            </template>
          </BaseField>
          <BaseField label="Notas para el control">
            <template #default="{ id }">
              <BaseInput
                :id="id"
                v-model="c.nextControlNotes"
                placeholder="Ej. revisar evolución del apetito, control de peso"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <QuickActionsCard :counts="counts" @select="onSelectAction" />

      <div v-if="draft.actionsCount.value > 0" class="actions-banner">
        <Sparkles :size="14" :stroke-width="1.7" />
        <span>
          <strong>{{ draft.actionsCount.value }}</strong> acción{{
            draft.actionsCount.value === 1 ? '' : 'es'
          }}
          generada{{ draft.actionsCount.value === 1 ? '' : 's' }} · se guardarán al confirmar la
          consulta.
        </span>
      </div>
    </div>
  </ContentWrap>

  <RecetaModal
    :open="open.receta"
    :pet="draft.state.pet"
    :existing="draft.state.prescriptions"
    @save="onSavePrescription"
    @remove-existing="draft.removePrescription"
    @update-existing="draft.updatePrescription"
    @close="open.receta = false"
  />
  <LabTestModal
    :open="open.lab"
    :pet="draft.state.pet"
    :existing="draft.state.laboratoryTests"
    @save="onSaveLabTests"
    @remove-existing="draft.removeLaboratoryTest"
    @update-existing="draft.updateLaboratoryTest"
    @close="open.lab = false"
  />
  <ImagingModal
    :open="open.imaging"
    :pet="draft.state.pet"
    :existing="draft.state.diagnosticImagings"
    @save="onSaveImaging"
    @remove-existing="draft.removeDiagnosticImaging"
    @update-existing="draft.updateDiagnosticImaging"
    @close="open.imaging = false"
  />
  <VaccinationModal
    :open="open.vaccination"
    :pet="draft.state.pet"
    :existing="draft.state.vaccinations"
    @save="onSaveVaccinations"
    @remove-existing="draft.removeVaccination"
    @update-existing="draft.updateVaccination"
    @close="open.vaccination = false"
  />
  <HospitalizationModal
    :open="open.hospitalization"
    :pet="draft.state.pet"
    :existing="draft.state.hospitalizations"
    @save="onSaveHospitalization"
    @remove-existing="draft.removeHospitalization"
    @update-existing="draft.updateHospitalization"
    @close="open.hospitalization = false"
  />
  <DewormingModal
    :open="open.deworming"
    :pet="draft.state.pet"
    :existing="draft.state.dewormings"
    @save="onSaveDeworming"
    @remove-existing="draft.removeDeworming"
    @update-existing="draft.updateDeworming"
    @close="open.deworming = false"
  />
  <SurgeryModal
    :open="open.surgery"
    :pet="draft.state.pet"
    :existing="draft.state.surgeries"
    @save="onSaveSurgery"
    @remove-existing="draft.removeSurgery"
    @update-existing="draft.updateSurgery"
    @close="open.surgery = false"
  />
</template>

<style scoped>
.catalog-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  padding: 10px 14px;
  background: oklch(94% 0.06 25deg);
  border: 1px solid oklch(85% 0.1 25deg);
  color: oklch(35% 0.15 25deg);
  border-radius: 10px;
  margin-bottom: 14px;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: clamp(12px, 0.8vw + 6px, 22px);
}

.grid-1-2 {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr);
  gap: clamp(14px, 1.2vw + 4px, 28px);
}

.weight-row {
  margin-top: clamp(14px, 1.2vw + 4px, 28px);
  max-width: 320px;
}

.planes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 1vw + 4px, 22px);
}

.vitals-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 1vw + 4px, 20px);
}

.findings-row {
  margin-top: clamp(12px, 1vw + 4px, 20px);
}

.prognosis-row {
  margin-top: clamp(12px, 1vw + 4px, 18px);
  max-width: 420px;
}

@media (width <= 880px) {
  .grid-1-2,
  .planes {
    grid-template-columns: 1fr;
  }

  .vitals-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (width <= 560px) {
  .vitals-grid {
    grid-template-columns: 1fr;
  }
}

.actions-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  color: var(--amatista-700);
  border-radius: 10px;
  font-size: 12.5px;
  margin-top: 4px;
}

.actions-banner strong {
  font-weight: 600;
}

.field-error {
  margin: 8px 0 0;
  font-size: 11.5px;
  color: oklch(55% 0.18 25deg);
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>

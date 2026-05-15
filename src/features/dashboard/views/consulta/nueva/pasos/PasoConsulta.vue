<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import {
  Stethoscope,
  ClipboardList,
  TriangleAlert,
  Pill,
  FlaskConical,
  Calendar,
  Sparkles,
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
import { useConsultationTypes } from '../composables/useConsultationTypes'
import {
  useNuevaConsultaDraft,
  type ActionKind,
} from '../composables/useNuevaConsultaDraft'
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
          <BaseField label="Fecha" required>
            <template #default="{ id }">
              <DateInput :id="id" v-model="c.date" />
            </template>
          </BaseField>
          <BaseField label="Tipo de consulta" required>
            <template #default="{ id }">
              <BaseSelect
                :id="id"
                v-model="c.typeId"
                :options="typeOptions"
                :placeholder="loadingTypes ? 'Cargando…' : 'Selecciona un tipo'"
                :disabled="loadingTypes"
              />
            </template>
          </BaseField>
        </div>
      </SectionCard>

      <SectionCard
        :icon="ClipboardList"
        title="Anamnesis"
        subtitle="Lo que reporta el dueño · Antecedentes"
      >
        <BaseTextarea
          v-model="c.anamnesis"
          :rows="4"
          placeholder="Motivo de consulta, signos observados, antecedentes relevantes…"
        />
      </SectionCard>

      <SectionCard
        :icon="TriangleAlert"
        title="Diagnóstico"
        subtitle="Presuntivo o definitivo · Diferenciales"
      >
        <BaseTextarea
          v-model="c.diagnosis"
          :rows="3"
          placeholder="Diagnóstico presuntivo, diagnósticos diferenciales considerados…"
        />
      </SectionCard>

      <div class="planes">
        <SectionCard
          :icon="FlaskConical"
          title="Plan diagnóstico"
          subtitle="Exámenes complementarios"
        >
          <BaseTextarea
            v-model="c.diagnosticPlan"
            :rows="4"
            placeholder="Hemograma, bioquímica, ecografía abdominal…"
          />
        </SectionCard>
        <SectionCard
          :icon="Pill"
          title="Plan terapéutico"
          subtitle="Tratamiento e indicaciones"
        >
          <BaseTextarea
            v-model="c.therapeuticPlan"
            :rows="4"
            placeholder="Medicación, indicaciones para el dueño, dieta…"
          />
        </SectionCard>
      </div>

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
          generada{{ draft.actionsCount.value === 1 ? '' : 's' }} · se guardarán
          al confirmar la consulta.
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
  background: oklch(94% 0.06 25);
  border: 1px solid oklch(85% 0.10 25);
  color: oklch(35% 0.15 25);
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
.planes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(12px, 1vw + 4px, 22px);
}
@media (max-width: 880px) {
  .grid-1-2,
  .planes {
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
</style>

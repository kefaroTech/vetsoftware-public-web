<script setup lang="ts">
/**
 * Panel de acciones rápidas del paso 3: la tarjeta de accesos, los siete
 * modales que abre y el contador de lo generado.
 *
 * Se extrae de `PasoConsulta.vue` porque es una costura completa: nada de lo que
 * hay aquí se comparte con el formulario clínico del paso — ni estado, ni CSS, ni
 * validación. El borrador se lee del store de Pinia (`useNuevaConsultaDraft`), así
 * que este componente no necesita props: montarlo dos veces leería el mismo estado.
 */
import { computed, reactive } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import QuickActionsCard from './QuickActionsCard.vue'
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
</script>

<template>
  <QuickActionsCard :counts="counts" @select="onSelectAction" />

  <div v-if="draft.actionsCount.value > 0" class="actions-banner ds-flex-row">
    <Sparkles :size="14" :stroke-width="1.7" />
    <span>
      <strong>{{ draft.actionsCount.value }}</strong> acción{{
        draft.actionsCount.value === 1 ? '' : 'es'
      }}
      generada{{ draft.actionsCount.value === 1 ? '' : 's' }} · se guardarán al confirmar la
      consulta.
    </span>
  </div>

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
.actions-banner {
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

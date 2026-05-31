<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import HospBoard from '../components/HospBoard.vue'
import HospDetail from '../components/HospDetail.vue'
import TreatmentScreen from '../components/TreatmentScreen.vue'
import { useHospitalizacion } from '../composables/useHospitalizacion'
import { useToast } from '@/composables/useToast'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { OrderKind, OrderVM } from '../types/hospital'
import type { ReasonLeaving } from '@/types/domain'
import type { CreateHospitalizationMedicationPayload } from '../api/hospitalizationMedication.api'

type OrderPayload = Omit<CreateHospitalizationMedicationPayload, 'hospitalizationId'>

const toast = useToast()
const {
  board,
  boardLoading,
  boardError,
  loadBoard,
  patient,
  meds,
  procs,
  observations,
  notes,
  loadDetail,
  closeDetail,
  addMedication,
  updateMedication,
  removeMedication,
  addProcedure,
  updateProcedure,
  removeProcedure,
  addObservation,
  addProgressNote,
  discharge,
  applyDose,
  moveDose,
} = useHospitalizacion()

const mode = ref<'board' | 'detail' | 'treatment'>('board')
const now = ref(new Date())

onMounted(loadBoard)

async function openPatient(p: HospitalizationResponse) {
  await loadDetail(p)
  mode.value = 'detail'
}
function backToBoard() {
  closeDetail()
  mode.value = 'board'
}

async function onAdd(kind: OrderKind, payload: OrderPayload) {
  try {
    if (kind === 'med') await addMedication(payload)
    else await addProcedure(payload)
    toast.success(
      kind === 'med' ? 'Medicamento añadido' : 'Procedimiento añadido',
      `${payload.name} se agregó al plan.`,
    )
  } catch (e) {
    toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}

async function onEdit(kind: OrderKind, id: number, payload: OrderPayload) {
  try {
    if (kind === 'med') await updateMedication(id, payload)
    else await updateProcedure(id, payload)
    toast.success('Plan actualizado', `${payload.name} se modificó.`)
  } catch (e) {
    toast.error('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}

async function onRemove(kind: OrderKind, id: number) {
  try {
    if (kind === 'med') await removeMedication(id)
    else await removeProcedure(id)
    toast.info(kind === 'med' ? 'Medicamento eliminado' : 'Procedimiento eliminado')
  } catch (e) {
    toast.error('No se pudo eliminar', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}

function onApply(order: OrderVM, slotId: string) {
  applyDose(order, slotId)
  toast.info('Dosis registrada', 'Aplicación marcada en esta sesión (no persistida aún).')
}

function onMove(
  order: OrderVM,
  slotId: string,
  newDate: string,
  newTime: string,
  m: 'one' | 'cascade',
) {
  moveDose(order, slotId, newDate, newTime, m)
  toast.info('Toma reprogramada', m === 'cascade' ? 'Se recalcularon las tomas siguientes.' : 'Se movió esta toma.')
}

async function onAddObservation(text: string) {
  try {
    await addObservation(text)
    toast.success('Observación guardada')
  } catch (e) {
    toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}

async function onAddNote(text: string) {
  try {
    await addProgressNote(text)
    toast.success('Nota evolutiva guardada')
  } catch (e) {
    toast.error('No se pudo guardar', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}

async function onDischarge(reason: ReasonLeaving) {
  try {
    const name = patient.value?.animal.name ?? 'El paciente'
    await discharge(reason)
    backToBoard()
    toast.success('Paciente dado de alta', `${name} salió del tablero.`)
  } catch (e) {
    toast.error('No se pudo dar de alta', e instanceof Error ? e.message : 'Intenta de nuevo.')
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Hospitalización"
      title="Pacientes internados"
      lead="Gestión de animales hospitalizados: plan de tratamiento, administración de dosis, observaciones y evolución."
    />

    <div v-if="boardError" class="banner error">{{ boardError }}</div>

    <HospBoard
      v-if="mode === 'board'"
      :items="board"
      :loading="boardLoading"
      @open="openPatient"
    />

    <HospDetail
      v-else-if="mode === 'detail' && patient"
      :patient="patient"
      :observations="observations"
      :notes="notes"
      @back="backToBoard"
      @administer="mode = 'treatment'"
      @discharge="onDischarge"
      @add-observation="onAddObservation"
      @add-note="onAddNote"
    />

    <TreatmentScreen
      v-else-if="mode === 'treatment' && patient"
      :meds="meds"
      :procs="procs"
      :patient-name="patient.animal.name"
      :now="now"
      @back="mode = 'detail'"
      @add="onAdd"
      @edit="onEdit"
      @remove="onRemove"
      @apply="onApply"
      @move="onMove"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
</style>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import HospBoard from '../components/HospBoard.vue'
import HospDetail from '../components/HospDetail.vue'
import TreatmentScreen from '../components/TreatmentScreen.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useHospitalizacion } from '../composables/useHospitalizacion'
import { useToast } from '@/composables/useToast'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type { OrderKind, OrderVM } from '../types/hospital'
import type { ReasonLeaving } from '@/types/domain'
import type { CreateHospitalizationMedicationPayload } from '../types/hospitalizationMedication.types'

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
  suspendMedication,
  addProcedure,
  updateProcedure,
  suspendProcedure,
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
    toast.errorFrom('No se pudo guardar', e, 'Intenta de nuevo.')
  }
}

async function onEdit(kind: OrderKind, id: number, payload: OrderPayload) {
  try {
    if (kind === 'med') await updateMedication(id, payload)
    else await updateProcedure(id, payload)
    toast.success('Plan actualizado', `${payload.name} se modificó.`)
  } catch (e) {
    toast.errorFrom('No se pudo actualizar', e, 'Intenta de nuevo.')
  }
}

async function onSuspend(kind: OrderKind, id: number) {
  try {
    if (kind === 'med') await suspendMedication(id)
    else await suspendProcedure(id)
    toast.info(
      kind === 'med' ? 'Medicamento suspendido' : 'Procedimiento suspendido',
      'Se conservaron las dosis aplicadas; se retiraron las pendientes.',
    )
  } catch (e) {
    toast.errorFrom('No se pudo suspender', e, 'Intenta de nuevo.')
  }
}

async function onApply(order: OrderVM, slotId: string) {
  try {
    await applyDose(order, slotId)
    toast.success('Dosis registrada', `${order.name} marcada como aplicada.`)
  } catch (e) {
    toast.errorFrom('No se pudo registrar', e, 'Intenta de nuevo.')
  }
}

async function onMove(
  order: OrderVM,
  slotId: string,
  newDate: string,
  newTime: string,
  m: 'one' | 'cascade',
) {
  try {
    await moveDose(order, slotId, newDate, newTime, m)
    toast.success(
      'Toma reprogramada',
      m === 'cascade' ? 'Se recalcularon las tomas siguientes.' : 'Se movió esta toma.',
    )
  } catch (e) {
    toast.errorFrom('No se pudo reprogramar', e, 'Intenta de nuevo.')
  }
}

async function onAddObservation(text: string) {
  try {
    await addObservation(text)
    toast.success('Observación guardada')
  } catch (e) {
    toast.errorFrom('No se pudo guardar', e, 'Intenta de nuevo.')
  }
}

async function onAddNote(text: string) {
  try {
    await addProgressNote(text)
    toast.success('Nota evolutiva guardada')
  } catch (e) {
    toast.errorFrom('No se pudo guardar', e, 'Intenta de nuevo.')
  }
}

async function onDischarge(reason: ReasonLeaving) {
  try {
    const name = patient.value?.animal.name ?? 'El paciente'
    await discharge(reason)
    backToBoard()
    toast.success('Paciente dado de alta', `${name} salió del tablero.`)
  } catch (e) {
    toast.errorFrom('No se pudo dar de alta', e, 'Intenta de nuevo.')
  }
}
</script>

<template>
  <div class="ds-page">
    <div v-if="boardError" class="ds-banner ds-banner--error">{{ boardError }}</div>

    <template v-if="mode === 'board'">
      <PageHeader
        kicker="Hospitalización"
        title="Pacientes internados"
        lead="Animales hospitalizados: plan de tratamiento, administración de dosis y evolución."
      />
      <HospBoard :items="board" :loading="boardLoading" @open="openPatient" />
    </template>

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
      @suspend="onSuspend"
      @apply="onApply"
      @move="onMove"
    />
  </div>
</template>

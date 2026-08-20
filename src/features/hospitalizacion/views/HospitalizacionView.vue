<script setup lang="ts">
import { onMounted, ref } from 'vue'
import HospBoard from '../components/HospBoard.vue'
import HospDetail from '../components/HospDetail.vue'
import TreatmentScreen from '../components/TreatmentScreen.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useHospitalizacion } from '../composables/useHospitalizacion'
import { useToast } from '@/composables/useToast'
import { isConcurrencyConflict } from '@/services/http/http.client'
import type { HospitalizationResponse } from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import type { OrderKind, OrderVM } from '../types/hospital'
import type { ReasonLeaving } from '@/types/domain'
import type { CreateHospitalizationMedicationPayload } from '../types/hospitalizationMedication.types'

type OrderPayload = Omit<CreateHospitalizationMedicationPayload, 'hospitalizationId'>

const CONFLICT_MESSAGE =
  'El registro fue modificado por otra operación; se recargó la información. Revisa y reintenta.'

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

/**
 * Trae de nuevo el plan completo del paciente abierto (medicaciones,
 * procedimientos, calendarios, observaciones y notas). `patient` puede ser null
 * si el conflicto llegó con el detalle ya cerrado: entonces no hay nada que
 * recargar y el aviso basta.
 */
async function reloadDetail() {
  const p = patient.value
  if (p) await loadDetail(p)
}

/**
 * Tras un conflicto al dar de alta, el paciente NO salió del tablero: la
 * operación se rechazó entera. Recargar solo el detalle no serviría, porque el
 * payload del alta se arma a partir de `patient` y es justo esa copia la que
 * quedó desfasada; `loadDetail` la reutiliza tal cual y el reintento volvería a
 * chocar. Por eso se recarga el tablero y se reabre el detalle con la fila
 * fresca. Si ya no está en el tablero es que otro la dio de alta mientras tanto:
 * el detalle ya no tiene sentido y se vuelve al listado.
 */
async function reloadAfterDischarge() {
  const id = patient.value?.id
  await loadBoard()
  const fresh = id == null ? undefined : board.value.find((h) => h.id === id)
  if (fresh) await loadDetail(fresh)
  else backToBoard()
}

/**
 * Manejador único de los `catch` de la pantalla (mismo precedente que
 * `AgendaView.handleError`).
 *
 * Desde que el backend versiona también los UPDATE en bloque de
 * `medication_schedules` y `procedure_schedules`, cualquier operación de esta
 * pantalla puede volver con 409 `CONCURRENT_MODIFICATION` porque otra persona
 * —o la otra pestaña del mismo usuario— tocó la fila mientras esta la tenía
 * abierta. Tratarlo como error fatal dejaba al usuario con el estado viejo en
 * pantalla: al reintentar mandaba otra vez la misma versión caducada y el 409 se
 * repetía en bucle, sin salida salvo recargar a mano. Por eso el conflicto
 * recarga datos frescos y avisa con `warn` y no con `error`: no se perdió nada,
 * solo hay que revisar lo que hay ahora y reintentar.
 *
 * El resto de errores conservan `errorFrom`, que es el único camino que rescata
 * el `X-Trace-Id` de la respuesta.
 */
async function handleError(
  e: unknown,
  title: string,
  reload: () => Promise<void> = reloadDetail,
): Promise<void> {
  if (isConcurrencyConflict(e)) {
    await reload()
    toast.warn('Conflicto de concurrencia', CONFLICT_MESSAGE)
    return
  }
  toast.errorFrom(title, e, 'Intenta de nuevo.')
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
    await handleError(e, 'No se pudo guardar')
  }
}

async function onEdit(kind: OrderKind, id: number, payload: OrderPayload) {
  try {
    if (kind === 'med') await updateMedication(id, payload)
    else await updateProcedure(id, payload)
    toast.success('Plan actualizado', `${payload.name} se modificó.`)
  } catch (e) {
    await handleError(e, 'No se pudo actualizar')
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
    await handleError(e, 'No se pudo suspender')
  }
}

async function onApply(order: OrderVM, slotId: string) {
  try {
    await applyDose(order, slotId)
    toast.success('Dosis registrada', `${order.name} marcada como aplicada.`)
  } catch (e) {
    await handleError(e, 'No se pudo registrar')
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
    await handleError(e, 'No se pudo reprogramar')
  }
}

async function onAddObservation(text: string) {
  try {
    await addObservation(text)
    toast.success('Observación guardada')
  } catch (e) {
    await handleError(e, 'No se pudo guardar')
  }
}

async function onAddNote(text: string) {
  try {
    await addProgressNote(text)
    toast.success('Nota evolutiva guardada')
  } catch (e) {
    await handleError(e, 'No se pudo guardar')
  }
}

async function onDischarge(reason: ReasonLeaving) {
  try {
    const name = patient.value?.animal.name ?? 'El paciente'
    await discharge(reason)
    backToBoard()
    toast.success('Paciente dado de alta', `${name} salió del tablero.`)
  } catch (e) {
    await handleError(e, 'No se pudo dar de alta', reloadAfterDischarge)
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

import { ref } from 'vue'
import { hospitalizationApi } from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type {
  HospitalizationResponse,
  CreateHospitalizationPayload,
} from '@/features/dashboard/views/consulta/nueva/types/hospitalization.types'
import { hospitalizationMedicationApi } from '../api/hospitalizationMedication.api'
import type {
  HospitalizationMedicationResponse,
  CreateHospitalizationMedicationPayload,
  UpdateHospitalizationMedicationPayload,
} from '../types/hospitalizationMedication.types'
import { medicationScheduleApi } from '../api/medicationSchedule.api'
import { hospitalizationProcedureApi } from '../api/hospitalizationProcedure.api'
import type {
  HospitalizationProcedureResponse,
  CreateHospitalizationProcedurePayload,
  UpdateHospitalizationProcedurePayload,
} from '../types/hospitalizationProcedure.types'
import { procedureScheduleApi } from '../api/procedureSchedule.api'
import { hospitalizationObservationApi } from '../api/hospitalizationObservation.api'
import type { HospitalizationObservationResponse } from '../types/hospitalizationObservation.types'
import { hospitalizationProgressNoteApi } from '../api/hospitalizationProgressNote.api'
import type { HospitalizationProgressNoteResponse } from '../types/hospitalizationProgressNote.types'
import { useAuth } from '@/features/auth/composables/useAuth'
import { todayISO } from '@/composables/format'
import { scheduleToDoseSlot } from './mar'
import type { DoseSlot, MedOrderVM, OrderVM, ProcOrderVM } from '../types/hospital'
import type { ReasonLeaving } from '@/types/domain'

/** El calendario de medicación se persiste en backend (tabla medication_schedules). */
function toMedVM(r: HospitalizationMedicationResponse, slots: DoseSlot[]): MedOrderVM {
  return { ...r, kind: 'med', schedule: slots }
}

/** El calendario de procedimientos se persiste en backend (tabla procedure_schedules). */
function toProcVM(r: HospitalizationProcedureResponse, slots: DoseSlot[]): ProcOrderVM {
  return { ...r, kind: 'proc', schedule: slots }
}

/**
 * Estado de la sala de hospitalización: tablero de internados + detalle de un
 * paciente (planes, observaciones, notas) + motor MAR client-side (volátil).
 */
export function useHospitalizacion() {
  const auth = useAuth()

  // ── Tablero ──
  const board = ref<HospitalizationResponse[]>([])
  const boardLoading = ref(false)
  const boardError = ref<string | null>(null)

  async function loadBoard() {
    boardLoading.value = true
    boardError.value = null
    try {
      const all = await hospitalizationApi.listByCompany()
      board.value = all.filter((h) => h.enabled && h.type === 'HOSPITALIZATION' && !h.endDate)
    } catch (e) {
      boardError.value = e instanceof Error ? e.message : 'No se pudo cargar el tablero'
    } finally {
      boardLoading.value = false
    }
  }

  // ── Detalle de paciente ──
  const patient = ref<HospitalizationResponse | null>(null)
  const meds = ref<MedOrderVM[]>([])
  const procs = ref<ProcOrderVM[]>([])
  const observations = ref<HospitalizationObservationResponse[]>([])
  const notes = ref<HospitalizationProgressNoteResponse[]>([])
  const detailLoading = ref(false)
  const detailError = ref<string | null>(null)

  async function loadDetail(h: HospitalizationResponse) {
    patient.value = h
    detailLoading.value = true
    detailError.value = null
    try {
      const [m, p, o, n, medSchedules, procSchedules] = await Promise.all([
        hospitalizationMedicationApi.listByHospitalization(h.id),
        hospitalizationProcedureApi.listByHospitalization(h.id),
        hospitalizationObservationApi.listByHospitalization(h.id),
        hospitalizationProgressNoteApi.listByHospitalization(h.id),
        medicationScheduleApi.listByHospitalization(h.id),
        procedureScheduleApi.listByHospitalization(h.id),
      ])
      // Agrupa las tomas persistidas por medicación
      const slotsByMed = new Map<number, DoseSlot[]>()
      for (const s of medSchedules) {
        const list = slotsByMed.get(s.hospitalizationMedication.id) ?? []
        list.push(scheduleToDoseSlot(s))
        slotsByMed.set(s.hospitalizationMedication.id, list)
      }
      // Agrupa las ejecuciones persistidas por procedimiento
      const slotsByProc = new Map<number, DoseSlot[]>()
      for (const s of procSchedules) {
        const list = slotsByProc.get(s.hospitalizationProcedure.id) ?? []
        list.push(scheduleToDoseSlot(s))
        slotsByProc.set(s.hospitalizationProcedure.id, list)
      }
      meds.value = m.map((med) => toMedVM(med, slotsByMed.get(med.id) ?? []))
      procs.value = p.map((proc) => toProcVM(proc, slotsByProc.get(proc.id) ?? []))
      observations.value = o
      notes.value = n
    } catch (e) {
      detailError.value = e instanceof Error ? e.message : 'No se pudo cargar el paciente'
    } finally {
      detailLoading.value = false
    }
  }

  function closeDetail() {
    patient.value = null
    meds.value = []
    procs.value = []
    observations.value = []
    notes.value = []
  }

  // ── CRUD medicamentos ──
  async function addMedication(
    payload: Omit<CreateHospitalizationMedicationPayload, 'hospitalizationId'>,
  ) {
    if (!patient.value) return
    const created = await hospitalizationMedicationApi.create({
      ...payload,
      hospitalizationId: patient.value.id,
    })
    // El backend calcula y persiste las tomas según frecuencia + duración
    const schedule = await medicationScheduleApi.generate(created.id)
    meds.value.push(toMedVM(created, schedule.map(scheduleToDoseSlot)))
  }

  async function updateMedication(id: number, payload: UpdateHospitalizationMedicationPayload) {
    const updated = await hospitalizationMedicationApi.update(id, payload)
    // Regenera el calendario (pudo cambiar frecuencia/duración/inicio)
    const schedule = await medicationScheduleApi.generate(id)
    const idx = meds.value.findIndex((m) => m.id === id)
    if (idx >= 0) meds.value.splice(idx, 1, toMedVM(updated, schedule.map(scheduleToDoseSlot)))
  }

  async function removeMedication(id: number) {
    await hospitalizationMedicationApi.remove(id)
    meds.value = meds.value.filter((m) => m.id !== id)
  }

  /** Suspende: marca la orden + borra (soft) las tomas pendientes; conserva las aplicadas. */
  async function suspendMedication(id: number) {
    const updated = await hospitalizationMedicationApi.suspend(id)
    const remaining = await medicationScheduleApi.suspendPending(id)
    const idx = meds.value.findIndex((m) => m.id === id)
    if (idx >= 0) meds.value.splice(idx, 1, toMedVM(updated, remaining.map(scheduleToDoseSlot)))
  }

  // ── CRUD procedimientos ──
  async function addProcedure(
    payload: Omit<CreateHospitalizationProcedurePayload, 'hospitalizationId'>,
  ) {
    if (!patient.value) return
    const created = await hospitalizationProcedureApi.create({
      ...payload,
      hospitalizationId: patient.value.id,
    })
    // El backend calcula y persiste las ejecuciones según frecuencia + duración
    const schedule = await procedureScheduleApi.generate(created.id)
    procs.value.push(toProcVM(created, schedule.map(scheduleToDoseSlot)))
  }

  async function updateProcedure(id: number, payload: UpdateHospitalizationProcedurePayload) {
    const updated = await hospitalizationProcedureApi.update(id, payload)
    // Regenera el calendario (pudo cambiar frecuencia/duración/inicio)
    const schedule = await procedureScheduleApi.generate(id)
    const idx = procs.value.findIndex((p) => p.id === id)
    if (idx >= 0) procs.value.splice(idx, 1, toProcVM(updated, schedule.map(scheduleToDoseSlot)))
  }

  async function removeProcedure(id: number) {
    await hospitalizationProcedureApi.remove(id)
    procs.value = procs.value.filter((p) => p.id !== id)
  }

  /** Suspende: marca la orden + borra (soft) las ejecuciones pendientes; conserva las aplicadas. */
  async function suspendProcedure(id: number) {
    const updated = await hospitalizationProcedureApi.suspend(id)
    const remaining = await procedureScheduleApi.suspendPending(id)
    const idx = procs.value.findIndex((p) => p.id === id)
    if (idx >= 0) procs.value.splice(idx, 1, toProcVM(updated, remaining.map(scheduleToDoseSlot)))
  }

  // ── Observaciones / notas evolutivas ──
  async function addObservation(description: string) {
    if (!patient.value) return
    const created = await hospitalizationObservationApi.create({
      description,
      hospitalizationId: patient.value.id,
    })
    observations.value.unshift(created)
  }

  async function addProgressNote(description: string) {
    if (!patient.value) return
    const created = await hospitalizationProgressNoteApi.create({
      description,
      hospitalizationId: patient.value.id,
    })
    notes.value.unshift(created)
  }

  // ── Alta (reutiliza PUT /hospitalizations) ──
  async function discharge(reasonLeaving: ReasonLeaving) {
    const h = patient.value
    if (!h) return
    const payload: CreateHospitalizationPayload = {
      date: h.date,
      startDate: h.startDate,
      endDate: todayISO(),
      type: h.type,
      reasonLeaving,
      reason: h.reason,
      observations: h.observations,
      animalId: h.animal.id,
      consultationId: h.consultation?.id ?? null,
      companyId: auth.companyId.value ?? h.company.id,
    }
    await hospitalizationApi.update(h.id, payload)
    board.value = board.value.filter((b) => b.id !== h.id)
  }

  // ── MAR (persistido en backend) ──
  function replaceSchedule(order: OrderVM, schedule: DoseSlot[]) {
    const list: OrderVM[] = order.kind === 'med' ? meds.value : procs.value
    const target = list.find((o) => o.id === order.id)
    if (target) target.schedule = schedule
  }

  /** Marca una toma como aplicada; el backend recalcula la pauta INTERVALO. */
  async function applyDose(order: OrderVM, slotId: string) {
    const id = Number(slotId)
    const slots =
      order.kind === 'med'
        ? await medicationScheduleApi.apply(id)
        : await procedureScheduleApi.apply(id)
    replaceSchedule(order, slots.map(scheduleToDoseSlot))
  }

  /** Reprograma una toma (mode one|cascade); el backend persiste y recalcula. */
  async function moveDose(
    order: OrderVM,
    slotId: string,
    newDate: string,
    newTime: string,
    mode: 'one' | 'cascade',
  ) {
    const id = Number(slotId)
    const newDateTime = `${newDate}T${newTime}:00`
    const slots =
      order.kind === 'med'
        ? await medicationScheduleApi.reschedule(id, newDateTime, mode)
        : await procedureScheduleApi.reschedule(id, newDateTime, mode)
    replaceSchedule(order, slots.map(scheduleToDoseSlot))
  }

  return {
    board,
    boardLoading,
    boardError,
    loadBoard,
    patient,
    meds,
    procs,
    observations,
    notes,
    detailLoading,
    detailError,
    loadDetail,
    closeDetail,
    addMedication,
    updateMedication,
    removeMedication,
    suspendMedication,
    addProcedure,
    updateProcedure,
    removeProcedure,
    suspendProcedure,
    addObservation,
    addProgressNote,
    discharge,
    applyDose,
    moveDose,
  }
}

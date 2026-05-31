import { ref } from 'vue'
import {
  hospitalizationApi,
  type HospitalizationResponse,
  type CreateHospitalizationPayload,
} from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import {
  hospitalizationMedicationApi,
  type CreateHospitalizationMedicationPayload,
  type UpdateHospitalizationMedicationPayload,
} from '../api/hospitalizationMedication.api'
import {
  hospitalizationProcedureApi,
  type CreateHospitalizationProcedurePayload,
  type UpdateHospitalizationProcedurePayload,
} from '../api/hospitalizationProcedure.api'
import {
  hospitalizationObservationApi,
  type HospitalizationObservationResponse,
} from '../api/hospitalizationObservation.api'
import {
  hospitalizationProgressNoteApi,
  type HospitalizationProgressNoteResponse,
} from '../api/hospitalizationProgressNote.api'
import { useAuth } from '@/features/auth/composables/useAuth'
import { todayISO } from '@/features/dashboard/views/consulta/nueva/composables/format'
import { buildSchedule, intervalFromFrequency, recalcInterval } from './mar'
import type { MedOrderVM, OrderVM, ProcOrderVM } from '../types/hospital'
import type { ReasonLeaving } from '@/types/domain'

function toMedVM(r: MedOrderVM | (Omit<MedOrderVM, 'kind' | 'schedule'>)): MedOrderVM {
  return {
    ...(r as MedOrderVM),
    kind: 'med',
    schedule: buildSchedule({
      orderId: r.id,
      frequency: r.frequency,
      startDate: r.startDate,
      startTime: r.startTime,
      durationMeasure: r.durationMeasure,
      durationQuantity: r.durationQuantity,
    }),
  }
}

function toProcVM(r: Omit<ProcOrderVM, 'kind' | 'schedule'>): ProcOrderVM {
  return {
    ...(r as ProcOrderVM),
    kind: 'proc',
    schedule: buildSchedule({
      orderId: r.id,
      frequency: r.frequency,
      startDate: r.startDate,
      startTime: r.startTime,
      durationMeasure: r.durationMeasure,
      durationQuantity: r.durationQuantity,
    }),
  }
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
      const all = await hospitalizationApi.listAll()
      board.value = all.filter(
        (h) => h.enabled && h.type === 'HOSPITALIZATION' && !h.endDate,
      )
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
      const [m, p, o, n] = await Promise.all([
        hospitalizationMedicationApi.listByHospitalization(h.id),
        hospitalizationProcedureApi.listByHospitalization(h.id),
        hospitalizationObservationApi.listByHospitalization(h.id),
        hospitalizationProgressNoteApi.listByHospitalization(h.id),
      ])
      meds.value = m.map(toMedVM)
      procs.value = p.map(toProcVM)
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
    meds.value.push(toMedVM(created))
  }

  async function updateMedication(
    id: number,
    payload: UpdateHospitalizationMedicationPayload,
  ) {
    const updated = await hospitalizationMedicationApi.update(id, payload)
    const idx = meds.value.findIndex((m) => m.id === id)
    if (idx >= 0) meds.value.splice(idx, 1, toMedVM(updated))
  }

  async function removeMedication(id: number) {
    await hospitalizationMedicationApi.remove(id)
    meds.value = meds.value.filter((m) => m.id !== id)
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
    procs.value.push(toProcVM(created))
  }

  async function updateProcedure(
    id: number,
    payload: UpdateHospitalizationProcedurePayload,
  ) {
    const updated = await hospitalizationProcedureApi.update(id, payload)
    const idx = procs.value.findIndex((p) => p.id === id)
    if (idx >= 0) procs.value.splice(idx, 1, toProcVM(updated))
  }

  async function removeProcedure(id: number) {
    await hospitalizationProcedureApi.remove(id)
    procs.value = procs.value.filter((p) => p.id !== id)
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

  // ── MAR (client-side, volátil — NO persiste) ──
  function applyDose(order: OrderVM, slotId: string) {
    const list: OrderVM[] = order.kind === 'med' ? meds.value : procs.value
    const target = list.find((o) => o.id === order.id)
    if (!target) return
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`
    const slot = target.schedule.find((s) => s.id === slotId)
    if (!slot) return
    slot.status = 'APLICADA'
    slot.givenAt = time
    slot.givenBy = auth.me.value?.name ?? 'Tú'

    if (target.guidelineType === 'INTERVAL') {
      const interval = intervalFromFrequency(target.frequency)
      if (interval) {
        target.schedule = recalcInterval(
          target.schedule,
          slotId,
          slot.date,
          time,
          interval,
        )
      }
    }
  }

  function moveDose(
    order: OrderVM,
    slotId: string,
    newDate: string,
    newTime: string,
    mode: 'one' | 'cascade',
  ) {
    const list: OrderVM[] = order.kind === 'med' ? meds.value : procs.value
    const target = list.find((o) => o.id === order.id)
    if (!target) return
    const slot = target.schedule.find((s) => s.id === slotId)
    if (!slot) return
    slot.date = newDate
    slot.time = newTime
    if (mode === 'cascade' && target.guidelineType === 'INTERVAL') {
      const interval = intervalFromFrequency(target.frequency)
      if (interval) {
        target.schedule = recalcInterval(target.schedule, slotId, newDate, newTime, interval)
      }
    }
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
    addProcedure,
    updateProcedure,
    removeProcedure,
    addObservation,
    addProgressNote,
    discharge,
    applyDose,
    moveDose,
  }
}

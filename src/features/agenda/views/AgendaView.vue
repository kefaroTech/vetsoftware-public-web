<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ArrowLeft, Plus } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AgendaToolbar from '../components/AgendaToolbar.vue'
import AppointmentFilters from '../components/AppointmentFilters.vue'
import AppointmentSummary from '../components/AppointmentSummary.vue'
import AgendaMonthView from '../components/AgendaMonthView.vue'
import AgendaWeekView from '../components/AgendaWeekView.vue'
import AgendaDayView from '../components/AgendaDayView.vue'
import AppointmentDetailModal from '../components/AppointmentDetailModal.vue'
import AppointmentFormModal from '../components/AppointmentFormModal.vue'
import AgendaEventDetailModal from '../components/AgendaEventDetailModal.vue'
import { useAppointments } from '../composables/useAppointments'
import { useAgendaEvents } from '../composables/useAgendaEvents'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import { addDays, isoFromDate, startOfMonth, startOfWeek, parseISO } from '../composables/dateUtils'
import {
  APPT_STATUS,
  apptDate,
  apptTime,
  type AppointmentResponse,
  type AppointmentStatus,
  type CreateAppointmentRequest,
  type RescheduleAppointmentRequest,
  type UpdateAppointmentRequest,
} from '../types/appointment'
import type { AgendaEvent, AgendaItem } from '../types/agenda'
import { getProblemDetailMessage, isConcurrencyConflict } from '@/services/http/http.client'

type ViewMode = 'month' | 'week' | 'day'

const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.APPOINTMENT_CREATE)

const toast = useToast()

const {
  appointments,
  loading,
  error,
  originFilter,
  setRange,
  load,
  create,
  update,
  reschedule,
  changeStatus,
  cancel,
  remove,
} = useAppointments()

// ── Estado de vista (per-instancia) ──────────────────────────────────
const view = ref<ViewMode>('day')
const previousView = ref<ViewMode | null>(null)
const cursor = ref<Date>(new Date())

const selectedAppointment = ref<AppointmentResponse | null>(null)
const selectedEvent = ref<AgendaEvent | null>(null)
const formOpen = ref(false)
const formMode = ref<'create' | 'edit' | 'reschedule'>('create')
const formAppointment = ref<AppointmentResponse | null>(null)

// Eventos clínicos (read-only, coexisten con las citas).
const { events: clinicalEvents } = useAgendaEvents(cursor)

// ── Rango de citas: cubre el grid mensual de 6 semanas (como los eventos) ──
function applyRangeAndLoad(d: Date) {
  const gridStart = startOfWeek(startOfMonth(d))
  const gridEnd = addDays(gridStart, 41)
  setRange(isoFromDate(gridStart), isoFromDate(gridEnd))
  void load()
}
// Navegación (cambio de cursor) → nuevo rango + recarga desde el backend.
watch(cursor, (d) => applyRangeAndLoad(d))
// Al ABRIR la Agenda, siempre recargar desde el backend (sin usar caché del store).
onMounted(() => applyRangeAndLoad(cursor.value))

// ── Modelo unificado ─────────────────────────────────────────────────
const items = computed<AgendaItem[]>(() => {
  const out: AgendaItem[] = []
  if (originFilter.value !== 'CLINICAL') {
    for (const a of appointments.value) {
      out.push({
        kind: 'appointment',
        id: `appt-${a.id}`,
        date: apptDate(a.startAt),
        endDate: null,
        time: apptTime(a.startAt),
        appt: a,
      })
    }
  }
  if (originFilter.value !== 'APPOINTMENTS') {
    for (const ev of clinicalEvents.value) {
      out.push({
        kind: 'clinical',
        id: ev.id,
        date: ev.date,
        endDate: ev.endDate,
        time: null,
        event: ev,
      })
    }
  }
  return out
})

const dayAppointments = computed(() => {
  const iso = isoFromDate(cursor.value)
  return appointments.value.filter((a) => apptDate(a.startAt) === iso)
})

const focusDate = computed(() => isoFromDate(cursor.value))

// ── Navegación temporal ──────────────────────────────────────────────
function goToDay(day: Date) {
  cursor.value = day
  if (view.value !== 'day') {
    previousView.value = view.value
    view.value = 'day'
  }
}
function onUpdateView(v: ViewMode) {
  view.value = v
}
function onSetView(v: ViewMode) {
  if (v !== 'day') previousView.value = null
}
function goBack() {
  if (previousView.value) {
    view.value = previousView.value
    previousView.value = null
  }
}
const backLabel = computed(() =>
  previousView.value === 'month' ? 'Volver al mes' : 'Volver a la semana',
)

// ── Apertura de modales ──────────────────────────────────────────────
function openCreate() {
  formMode.value = 'create'
  formAppointment.value = null
  selectedAppointment.value = null
  formOpen.value = true
}
function openEdit(appt: AppointmentResponse) {
  formMode.value = 'edit'
  formAppointment.value = appt
  selectedAppointment.value = null
  formOpen.value = true
}
function openReschedule(appt: AppointmentResponse) {
  formMode.value = 'reschedule'
  formAppointment.value = appt
  selectedAppointment.value = null
  formOpen.value = true
}

function notifyClash(appt: AppointmentResponse) {
  const n = appt.overlappingAppointmentIds?.length ?? 0
  if (n > 0) {
    toast.warn(
      'Choque de horario',
      `La cita #${appt.id} coincide con ${n === 1 ? 'otra cita' : `${n} citas`} del mismo veterinario/a.`,
    )
  }
}

function handleError(e: unknown, title: string) {
  toast.error(title, getProblemDetailMessage(e, 'Inténtalo de nuevo.'))
  if (isConcurrencyConflict(e)) {
    void load()
  }
}

// ── Acciones ─────────────────────────────────────────────────────────
async function onFormSubmit(
  result:
    | { mode: 'create'; payload: CreateAppointmentRequest }
    | { mode: 'edit'; id: number; payload: UpdateAppointmentRequest }
    | { mode: 'reschedule'; id: number; payload: RescheduleAppointmentRequest },
) {
  try {
    if (result.mode === 'create') {
      const created = await create(result.payload)
      toast.success('Cita agendada', `Cita #${created.id} creada como Solicitada.`)
      const d = parseISO(apptDate(created.startAt))
      if (d) {
        cursor.value = d
        view.value = 'day'
      }
      notifyClash(created)
    } else if (result.mode === 'edit') {
      const updated = await update(result.id, result.payload)
      toast.success('Cita actualizada', `Cita #${updated.id} guardada.`)
      notifyClash(updated)
    } else {
      const updated = await reschedule(result.id, result.payload)
      toast.success('Cita reprogramada', `Cita #${updated.id} reprogramada.`)
      notifyClash(updated)
    }
    formOpen.value = false
  } catch (e) {
    handleError(e, 'No se pudo guardar la cita')
  }
}

async function onTransition(appt: AppointmentResponse, status: AppointmentStatus) {
  try {
    const updated = await changeStatus(appt.id, status)
    toast.success('Estado actualizado', `Cita #${updated.id} → ${APPT_STATUS[status].label}.`)
    selectedAppointment.value = updated
  } catch (e) {
    handleError(e, 'No se pudo cambiar el estado')
  }
}

async function onCancel(appt: AppointmentResponse, reason: string) {
  try {
    const updated = await cancel(appt.id, { reason: reason || null })
    toast.info('Cita cancelada', `Cita #${updated.id} cancelada.`)
    selectedAppointment.value = updated
  } catch (e) {
    handleError(e, 'No se pudo cancelar la cita')
  }
}

async function onRemove(appt: AppointmentResponse) {
  try {
    await remove(appt.id)
    toast.info('Cita eliminada', `Cita #${appt.id} eliminada.`)
    selectedAppointment.value = null
  } catch (e) {
    handleError(e, 'No se pudo eliminar la cita')
  }
}
</script>

<template>
  <section class="agenda-page">
    <PageHeader
      kicker="Trabajo · Citas"
      title="Agenda"
      lead="Reserva, confirma, atiende, reprograma y cancela citas. El choque de horario avisa, pero nunca bloquea."
    >
      <template #action>
        <button v-if="canCreate" type="button" class="cta" @click="openCreate">
          <Plus :size="16" :stroke-width="1.8" />
          Nueva cita
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="banner error">{{ error }}</div>

    <AgendaToolbar
      :view="view"
      :cursor="cursor"
      @update:view="onUpdateView"
      @update:cursor="(d: Date) => (cursor = d)"
      @set-view="onSetView"
    />

    <AppointmentFilters />

    <AppointmentSummary v-if="view === 'day'" :appointments="dayAppointments" />

    <button v-if="view === 'day' && previousView" type="button" class="back-btn" @click="goBack">
      <ArrowLeft :size="14" :stroke-width="1.8" />
      {{ backLabel }}
    </button>

    <div class="body">
      <div v-if="loading && items.length === 0" class="loading">Cargando citas…</div>
      <AgendaMonthView
        v-else-if="view === 'month'"
        :cursor="cursor"
        :items="items"
        @day-click="goToDay"
        @appointment-click="(a: AppointmentResponse) => (selectedAppointment = a)"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
      />
      <AgendaWeekView
        v-else-if="view === 'week'"
        :cursor="cursor"
        :items="items"
        @day-click="goToDay"
        @appointment-click="(a: AppointmentResponse) => (selectedAppointment = a)"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
      />
      <AgendaDayView
        v-else
        :cursor="cursor"
        :items="items"
        :can-create="canCreate"
        @appointment-click="(a: AppointmentResponse) => (selectedAppointment = a)"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
        @new="openCreate"
      />
    </div>

    <AppointmentDetailModal
      :appointment="selectedAppointment"
      @close="selectedAppointment = null"
      @edit="openEdit"
      @reschedule="openReschedule"
      @transition="onTransition"
      @cancel="onCancel"
      @remove="onRemove"
    />

    <AppointmentFormModal
      :open="formOpen"
      :mode="formMode"
      :appointment="formAppointment"
      :focus-date="focusDate"
      :existing="appointments"
      @close="formOpen = false"
      @submit="onFormSubmit"
    />

    <AgendaEventDetailModal :event="selectedEvent" @close="selectedEvent = null" />
  </section>
</template>

<style scoped>
.agenda-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1320px;
  margin: 0 auto;
  font-family: var(--font-sans);
  color: var(--warm-900);
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: white;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  box-shadow:
    0 1px 2px rgb(50 20 80 / 8%),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 50%);
  white-space: nowrap;
}

.banner.error {
  background: oklch(95% 0.06 25deg);
  border: 1px solid oklch(85% 0.12 25deg);
  color: oklch(40% 0.18 25deg);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}

.back-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: transparent;
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.back-btn:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}

.body {
  min-height: 600px;
}

.loading {
  padding: 28px;
  text-align: center;
  background: var(--warm-100);
  border: 1px dashed var(--warm-300);
  border-radius: 12px;
  color: var(--warm-500);
  font-size: 13px;
}
</style>

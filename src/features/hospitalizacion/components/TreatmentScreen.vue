<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Pencil, Ban } from 'lucide-vue-next'
import WeeklyMAR from './WeeklyMAR.vue'
import MoveDoseModal from './MoveDoseModal.vue'
import ApplyDoseModal from './ApplyDoseModal.vue'
import SuspendOrderModal from '../modals/SuspendOrderModal.vue'
import OrderFormModal from '../modals/OrderFormModal.vue'
import { startOfWeek, addDays, monthName } from '../composables/mar'
import {
  frequencyLabel,
  guidelineLabel,
  durationLabel,
  type DoseSlot,
  type MedOrderVM,
  type OrderKind,
  type OrderVM,
  type ProcOrderVM,
} from '../types/hospital'
import type { CreateHospitalizationMedicationPayload } from '../types/hospitalizationMedication.types'

type OrderPayload = Omit<CreateHospitalizationMedicationPayload, 'hospitalizationId'>

const props = defineProps<{
  meds: MedOrderVM[]
  procs: ProcOrderVM[]
  patientName: string
  now: Date
}>()

const emit = defineEmits<{
  back: []
  add: [kind: OrderKind, payload: OrderPayload]
  edit: [kind: OrderKind, id: number, payload: OrderPayload]
  suspend: [kind: OrderKind, id: number]
  apply: [order: OrderVM, slotId: string]
  move: [order: OrderVM, slotId: string, newDate: string, newTime: string, mode: 'one' | 'cascade']
}>()

const weekStart = ref(startOfWeek(props.now))
const allOrders = computed<OrderVM[]>(() => [...props.meds, ...props.procs])

const weekLabel = computed(() => {
  const end = addDays(weekStart.value, 6)
  const a = `${weekStart.value.getDate()} ${monthName(weekStart.value).slice(0, 3)}`
  const b = `${end.getDate()} ${monthName(end).slice(0, 3)}`
  return `${a} – ${b}`
})

function shiftWeek(n: number) {
  weekStart.value = addDays(weekStart.value, n * 7)
}
function goThisWeek() {
  weekStart.value = startOfWeek(props.now)
}

// ── Modal de orden ──
const orderModalOpen = ref(false)
const orderKind = ref<OrderKind>('med')
const editingOrder = ref<OrderVM | null>(null)

function openCreate(kind: OrderKind) {
  orderKind.value = kind
  editingOrder.value = null
  orderModalOpen.value = true
}
function openEdit(order: OrderVM) {
  orderKind.value = order.kind
  editingOrder.value = order
  orderModalOpen.value = true
}
function onOrderSave(payload: OrderPayload) {
  if (editingOrder.value) {
    emit('edit', orderKind.value, editingOrder.value.id, payload)
  } else {
    emit('add', orderKind.value, payload)
  }
  orderModalOpen.value = false
}

// ── Modal mover toma ──
const moveOpen = ref(false)
const pendingMove = ref<{
  order: OrderVM
  slotId: string
  newDate: string
  newTime: string
  fromTime: string
} | null>(null)

function onMoveRequest(order: OrderVM, slotId: string, newDate: string, newTime: string) {
  const slot = order.schedule.find((s) => s.id === slotId)
  pendingMove.value = {
    order,
    slotId,
    newDate,
    newTime,
    fromTime: slot ? slot.time.slice(0, 5) : '',
  }
  moveOpen.value = true
}
function onMoveConfirm(mode: 'one' | 'cascade') {
  const m = pendingMove.value
  if (m) emit('move', m.order, m.slotId, m.newDate, m.newTime, mode)
  moveOpen.value = false
  pendingMove.value = null
}

// ── Modal confirmar aplicación de dosis ──
const applyOpen = ref(false)
const pendingApply = ref<{ order: OrderVM; slot: DoseSlot } | null>(null)

function onApplyRequest(order: OrderVM, slotId: string) {
  const slot = order.schedule.find((s) => s.id === slotId)
  if (!slot) return
  pendingApply.value = { order, slot }
  applyOpen.value = true
}
function onApplyConfirm() {
  const a = pendingApply.value
  if (a) emit('apply', a.order, a.slot.id)
  applyOpen.value = false
  pendingApply.value = null
}

// ── Modal suspender orden ──
const suspendOpen = ref(false)
const pendingSuspend = ref<{ kind: OrderKind; id: number; name: string } | null>(null)

function askSuspend(kind: OrderKind, order: OrderVM) {
  pendingSuspend.value = { kind, id: order.id, name: order.name }
  suspendOpen.value = true
}
function onSuspendConfirm() {
  const s = pendingSuspend.value
  if (s) emit('suspend', s.kind, s.id)
  suspendOpen.value = false
  pendingSuspend.value = null
}
</script>

<template>
  <div class="ds-page">
    <button type="button" class="back ds-btn ds-btn--plain ds-hover-accent" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al paciente
    </button>

    <header class="head ds-head">
      <div>
        <div class="ds-kicker">Tratamiento · Administración semanal</div>
        <h2 class="title ds-display ds-display--xs">{{ patientName }}</h2>
      </div>
      <div class="ds-flex-row">
        <button type="button" class="nav" aria-label="Semana anterior" @click="shiftWeek(-1)">
          <ChevronLeft :size="16" :stroke-width="1.8" />
        </button>
        <button type="button" class="today" @click="goThisWeek">Hoy</button>
        <span class="weeklabel">{{ weekLabel }}</span>
        <button type="button" class="nav" aria-label="Semana siguiente" @click="shiftWeek(1)">
          <ChevronRight :size="16" :stroke-width="1.8" />
        </button>
      </div>
    </header>

    <WeeklyMAR
      :week-start="weekStart"
      :orders="allOrders"
      :now="now"
      @apply="onApplyRequest"
      @moverequest="onMoveRequest"
    />

    <!-- Plan de medicamentos -->
    <section class="plan">
      <div class="plan-head ds-block-head">
        <h3>Plan de medicamentos</h3>
        <button
          type="button"
          class="add ds-btn ds-btn--sm ds-tone--accent-soft"
          @click="openCreate('med')"
        >
          <Plus :size="14" :stroke-width="1.8" /> Añadir medicamento
        </button>
      </div>
      <p v-if="meds.length === 0" class="plan-empty">Sin medicamentos en el plan.</p>
      <div
        v-for="m in meds"
        :key="m.id"
        class="row ds-flex-row"
        :class="{ suspended: !!m.suspensionDate }"
      >
        <div class="ds-flex-fill">
          <div class="row-name ds-item-label">
            {{ m.name }}<span v-if="m.dose"> · {{ m.dose }}</span>
            <span v-if="m.suspensionDate" class="susp-badge">Suspendido</span>
          </div>
          <div class="row-detail">
            {{ frequencyLabel(m.frequency) }} · {{ guidelineLabel(m.guidelineType) }} ·
            {{ durationLabel(m.durationMeasure, m.durationQuantity) }}
          </div>
        </div>
        <template v-if="!m.suspensionDate">
          <button
            type="button"
            class="icon ds-hover-neutral"
            aria-label="Editar"
            @click="openEdit(m)"
          >
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button
            type="button"
            class="icon ds-hover-neutral"
            aria-label="Suspender"
            @click="askSuspend('med', m)"
          >
            <Ban :size="14" :stroke-width="1.7" />
          </button>
        </template>
      </div>
    </section>

    <!-- Plan de procedimientos -->
    <section class="plan">
      <div class="plan-head ds-block-head">
        <h3>Plan de procedimientos</h3>
        <button
          type="button"
          class="add ds-btn ds-btn--sm ds-tone--accent-soft"
          @click="openCreate('proc')"
        >
          <Plus :size="14" :stroke-width="1.8" /> Añadir procedimiento
        </button>
      </div>
      <p v-if="procs.length === 0" class="plan-empty">Sin procedimientos en el plan.</p>
      <div
        v-for="p in procs"
        :key="p.id"
        class="row ds-flex-row"
        :class="{ suspended: !!p.suspensionDate }"
      >
        <div class="ds-flex-fill">
          <div class="row-name ds-item-label">
            {{ p.name }}
            <span v-if="p.suspensionDate" class="susp-badge">Suspendido</span>
          </div>
          <div class="row-detail">
            {{ frequencyLabel(p.frequency) }} · {{ guidelineLabel(p.guidelineType) }} ·
            {{ durationLabel(p.durationMeasure, p.durationQuantity) }}
          </div>
        </div>
        <template v-if="!p.suspensionDate">
          <button
            type="button"
            class="icon ds-hover-neutral"
            aria-label="Editar"
            @click="openEdit(p)"
          >
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button
            type="button"
            class="icon ds-hover-neutral"
            aria-label="Suspender"
            @click="askSuspend('proc', p)"
          >
            <Ban :size="14" :stroke-width="1.7" />
          </button>
        </template>
      </div>
    </section>

    <OrderFormModal
      :open="orderModalOpen"
      :kind="orderKind"
      :initial="editingOrder"
      @save="onOrderSave"
      @close="orderModalOpen = false"
    />
    <MoveDoseModal
      :open="moveOpen"
      :guideline="pendingMove?.order.guidelineType ?? 'FIXED'"
      :from-time="pendingMove?.fromTime ?? ''"
      :to-time="pendingMove?.newTime ?? ''"
      @confirm="onMoveConfirm"
      @close="moveOpen = false"
    />
    <ApplyDoseModal
      :open="applyOpen"
      :order="pendingApply?.order ?? null"
      :dose-slot="pendingApply?.slot ?? null"
      @confirm="onApplyConfirm"
      @close="applyOpen = false"
    />
    <SuspendOrderModal
      :open="suspendOpen"
      :kind="pendingSuspend?.kind ?? 'med'"
      :name="pendingSuspend?.name ?? ''"
      @confirm="onSuspendConfirm"
      @close="suspendOpen = false"
    />
  </div>
</template>

<style scoped>
/* Resto sobre `.ds-btn --plain` + `.ds-hover-accent` (que gana al :hover de
   --plain por orden en primitives.css, con la misma especificidad). */
.back {
  margin-bottom: var(--space-14);
  padding: var(--space-6) var(--space-10);
  font-size: var(--text-body);
  font-weight: var(--weight-normal);
}

.head {
  gap: var(--space-18);
  margin-bottom: var(--space-14);
  flex-wrap: wrap;
}

/* Resto sobre `.ds-display --xs`: este titular no lleva el tracking negativo
   de la primitiva y arranca 4px por debajo del rótulo. */
.title {
  margin: var(--space-4) 0 0;
  letter-spacing: normal;
}

.nav,
.today {
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  color: var(--warm-700);
  display: grid;
  place-items: center;
}
.nav {
  width: 32px;
  height: 32px;
}
.today {
  padding: 0 12px;
  height: 32px;
  font-size: 12.5px;
  font-weight: 500;
}

/* A11Y-09: `--amatista-300` daba 1,99:1, por debajo del reposo `--warm-450`
   (3,54:1). `--amatista-450` da 3,69:1. */
.nav:hover,
.today:hover {
  border-color: var(--amatista-450);
}

.weeklabel {
  font-family: var(--font-display);
  font-size: 16px;
  color: var(--warm-800);
  min-width: 120px;
  text-align: center;
}

.plan {
  margin-top: 26px;
}

.plan-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--warm-900);
}

/* Resto sobre `.ds-btn --sm` + `.ds-tone--accent-soft`: borde y radio propios. */
.add {
  border-color: var(--amatista-450);
  border-radius: var(--radius-md);
}
.add:hover {
  border-color: var(--amatista-500);
}

.plan-empty {
  margin: 0;
  font-size: 13px;
  color: var(--warm-500);
  padding: 8px 0;
}

/* Resto sobre `.ds-flex-row`: gap propio (10px). */
.row {
  gap: var(--space-10);
  padding: var(--space-11) var(--space-12);
  background: var(--warm-100);
  border-radius: 10px;
  margin-bottom: 6px;
}

.row.suspended {
  opacity: 0.6;
  background: var(--warm-50);
  border: 1px dashed var(--warm-300);
}

.susp-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 8px;
  border-radius: var(--radius-pill);
  font-size: 11px;
  font-weight: 600;
  vertical-align: middle;
  background: var(--danger-150);
  color: var(--danger-700);
  border: 1px solid var(--danger-border);
}

.row-name {
  font-size: var(--text-lg);
}

.row-detail {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 2px;
}

.icon {
  width: 30px;
  height: 30px;
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
</style>

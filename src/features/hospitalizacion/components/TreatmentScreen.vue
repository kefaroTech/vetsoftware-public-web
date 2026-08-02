<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Pencil, Ban } from 'lucide-vue-next'
import WeeklyMAR from './WeeklyMAR.vue'
import MoveDoseModal from './MoveDoseModal.vue'
import ApplyDoseModal from './ApplyDoseModal.vue'
import SuspendOrderModal from '../modals/SuspendOrderModal.vue'
import OrderFormModal from '../modals/OrderFormModal.vue'
import { startOfWeek, addDays, MONTHS_LONG } from '../composables/mar'
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
import type { CreateHospitalizationMedicationPayload } from '../api/hospitalizationMedication.api'

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
  const a = `${weekStart.value.getDate()} ${MONTHS_LONG[weekStart.value.getMonth()].slice(0, 3)}`
  const b = `${end.getDate()} ${MONTHS_LONG[end.getMonth()].slice(0, 3)}`
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
  <div class="treat">
    <button type="button" class="back" @click="emit('back')">
      <ArrowLeft :size="14" :stroke-width="1.8" /> Volver al paciente
    </button>

    <header class="head">
      <div>
        <div class="kicker">Tratamiento · Administración semanal</div>
        <h2 class="title">{{ patientName }}</h2>
      </div>
      <div class="weeknav">
        <button type="button" class="nav" @click="shiftWeek(-1)">
          <ChevronLeft :size="16" :stroke-width="1.8" />
        </button>
        <button type="button" class="today" @click="goThisWeek">Hoy</button>
        <span class="weeklabel">{{ weekLabel }}</span>
        <button type="button" class="nav" @click="shiftWeek(1)">
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
      <div class="plan-head">
        <h3>Plan de medicamentos</h3>
        <button type="button" class="add" @click="openCreate('med')">
          <Plus :size="14" :stroke-width="1.8" /> Añadir medicamento
        </button>
      </div>
      <p v-if="meds.length === 0" class="plan-empty">Sin medicamentos en el plan.</p>
      <div v-for="m in meds" :key="m.id" class="row" :class="{ suspended: !!m.suspensionDate }">
        <div class="row-main">
          <div class="row-name">
            {{ m.name }}<span v-if="m.dose"> · {{ m.dose }}</span>
            <span v-if="m.suspensionDate" class="susp-badge">Suspendido</span>
          </div>
          <div class="row-detail">
            {{ frequencyLabel(m.frequency) }} · {{ guidelineLabel(m.guidelineType) }} ·
            {{ durationLabel(m.durationMeasure, m.durationQuantity) }}
          </div>
        </div>
        <template v-if="!m.suspensionDate">
          <button type="button" class="icon" aria-label="Editar" @click="openEdit(m)">
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button type="button" class="icon" aria-label="Suspender" @click="askSuspend('med', m)">
            <Ban :size="14" :stroke-width="1.7" />
          </button>
        </template>
      </div>
    </section>

    <!-- Plan de procedimientos -->
    <section class="plan">
      <div class="plan-head">
        <h3>Plan de procedimientos</h3>
        <button type="button" class="add" @click="openCreate('proc')">
          <Plus :size="14" :stroke-width="1.8" /> Añadir procedimiento
        </button>
      </div>
      <p v-if="procs.length === 0" class="plan-empty">Sin procedimientos en el plan.</p>
      <div v-for="p in procs" :key="p.id" class="row" :class="{ suspended: !!p.suspensionDate }">
        <div class="row-main">
          <div class="row-name">
            {{ p.name }}
            <span v-if="p.suspensionDate" class="susp-badge">Suspendido</span>
          </div>
          <div class="row-detail">
            {{ frequencyLabel(p.frequency) }} · {{ guidelineLabel(p.guidelineType) }} ·
            {{ durationLabel(p.durationMeasure, p.durationQuantity) }}
          </div>
        </div>
        <template v-if="!p.suspensionDate">
          <button type="button" class="icon" aria-label="Editar" @click="openEdit(p)">
            <Pencil :size="14" :stroke-width="1.7" />
          </button>
          <button type="button" class="icon" aria-label="Suspender" @click="askSuspend('proc', p)">
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
.treat {
  font-family: var(--font-sans);
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 6px 10px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--warm-600);
  cursor: pointer;
  margin-bottom: 14px;
}

.back:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
}

.title {
  margin: 4px 0 0;
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 400;
  color: var(--warm-900);
  line-height: 1.05;
}

.weeknav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav,
.today {
  border: 1px solid var(--warm-200);
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
.nav:hover,
.today:hover {
  border-color: var(--amatista-300);
}

.weeklabel {
  font-family: var(--font-serif);
  font-size: 16px;
  color: var(--warm-800);
  min-width: 120px;
  text-align: center;
}

.volatile-banner {
  margin: 0 0 16px;
  padding: 9px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: oklch(45% 0.13 70deg);
  background: oklch(96% 0.04 80deg);
  border-left: 3px solid oklch(70% 0.13 75deg);
  border-radius: 0 8px 8px 0;
}
.plan {
  margin-top: 26px;
}

.plan-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.plan-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--warm-900);
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--amatista-200);
  background: var(--amatista-50);
  color: var(--amatista-700);
  border-radius: 8px;
  padding: 7px 12px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
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

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
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
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  vertical-align: middle;
  background: oklch(94% 0.05 25deg);
  color: oklch(48% 0.18 25deg);
  border: 1px solid oklch(85% 0.08 25deg);
}
.row-main {
  flex: 1;
  min-width: 0;
}

.row-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
}

.row-detail {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 2px;
}

.icon {
  width: 30px;
  height: 30px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  border-radius: 8px;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  flex-shrink: 0;
}
.icon:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
</style>

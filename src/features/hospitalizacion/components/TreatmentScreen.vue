<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-vue-next'
import WeeklyMAR from './WeeklyMAR.vue'
import MoveDoseModal from './MoveDoseModal.vue'
import OrderFormModal from '../modals/OrderFormModal.vue'
import { startOfWeek, addDays, MONTHS_LONG } from '../composables/mar'
import {
  frequencyLabel,
  guidelineLabel,
  durationLabel,
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
  remove: [kind: OrderKind, id: number]
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

    <div class="volatile-banner">
      Las aplicaciones de dosis y reprogramaciones aún no se guardan en el servidor
      (se recalculan en esta sesión). El plan de medicamentos y procedimientos sí se
      persiste.
    </div>

    <WeeklyMAR
      :week-start="weekStart"
      :orders="allOrders"
      :now="now"
      @apply="(o, s) => emit('apply', o, s)"
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
      <div v-for="m in meds" :key="m.id" class="row">
        <div class="row-main">
          <div class="row-name">{{ m.name }}<span v-if="m.dose"> · {{ m.dose }}</span></div>
          <div class="row-detail">
            {{ frequencyLabel(m.frequency) }} · {{ guidelineLabel(m.guidelineType) }} ·
            {{ durationLabel(m.durationMeasure, m.durationQuantity) }}
          </div>
        </div>
        <button type="button" class="icon" aria-label="Editar" @click="openEdit(m)">
          <Pencil :size="14" :stroke-width="1.7" />
        </button>
        <button type="button" class="icon" aria-label="Eliminar" @click="emit('remove', 'med', m.id)">
          <Trash2 :size="14" :stroke-width="1.7" />
        </button>
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
      <div v-for="p in procs" :key="p.id" class="row">
        <div class="row-main">
          <div class="row-name">{{ p.name }}</div>
          <div class="row-detail">
            {{ frequencyLabel(p.frequency) }} · {{ guidelineLabel(p.guidelineType) }} ·
            {{ durationLabel(p.durationMeasure, p.durationQuantity) }}
          </div>
        </div>
        <button type="button" class="icon" aria-label="Editar" @click="openEdit(p)">
          <Pencil :size="14" :stroke-width="1.7" />
        </button>
        <button type="button" class="icon" aria-label="Eliminar" @click="emit('remove', 'proc', p.id)">
          <Trash2 :size="14" :stroke-width="1.7" />
        </button>
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
  </div>
</template>

<style scoped>
.treat { font-family: var(--font-sans); }
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
.nav { width: 32px; height: 32px; }
.today { padding: 0 12px; height: 32px; font-size: 12.5px; font-weight: 500; }
.nav:hover, .today:hover { border-color: var(--amatista-300); }
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
  color: oklch(45% 0.13 70);
  background: oklch(96% 0.04 80);
  border-left: 3px solid oklch(70% 0.13 75);
  border-radius: 0 8px 8px 0;
}
.plan { margin-top: 26px; }
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
.add:hover { border-color: var(--amatista-500); }
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
.row-main { flex: 1; min-width: 0; }
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
.icon:hover { background: var(--warm-100); color: var(--warm-900); }
</style>

<script setup lang="ts">
import { computed, ref, onMounted, nextTick, watch } from 'vue'
import { Lock } from 'lucide-vue-next'
import {
  WEEKDAYS_SHORT,
  addDays,
  isoFromDate,
  sameDay,
  effectiveDoseStatus,
  normalizeTime,
} from '../composables/mar'
import type { DoseSlot, OrderVM } from '../types/hospital'

const props = defineProps<{
  weekStart: Date
  orders: OrderVM[]
  now: Date
}>()

const emit = defineEmits<{
  apply: [order: OrderVM, slotId: string]
  moverequest: [order: OrderVM, slotId: string, newDate: string, newTime: string]
}>()

interface Entry {
  order: OrderVM
  slot: DoseSlot
  dayIso: string
  hour: number
}

/** Eje continuo de 24 horas: cada celda hora×día es zona de drop. */
const HOURS = Array.from({ length: 24 }, (_, h) => h)

const days = computed(() => Array.from({ length: 7 }, (_, i) => addDays(props.weekStart, i)))
const dayIsos = computed(() => days.value.map(isoFromDate))

/**
 * La rejilla itera esto y no `days` + `dayIsos` por separado: la fecha y su ISO
 * viajan juntas, así que la celda deja de cruzar dos arrays por índice para
 * saber a qué día pertenece.
 */
const dayCells = computed(() => days.value.map((date) => ({ date, iso: isoFromDate(date) })))

const entries = computed<Entry[]>(() => {
  const set = new Set(dayIsos.value)
  const out: Entry[] = []
  for (const order of props.orders) {
    for (const slot of order.schedule) {
      if (!set.has(slot.date)) continue
      const hour = Number(normalizeTime(slot.time).split(':')[0]) || 0
      out.push({ order, slot, dayIso: slot.date, hour })
    }
  }
  return out
})

const hasEntries = computed(() => entries.value.length > 0)

function chipsAt(dayIso: string, hour: number): Entry[] {
  return entries.value.filter((e) => e.dayIso === dayIso && e.hour === hour)
}

function statusOf(slot: DoseSlot): string {
  return effectiveDoseStatus(slot, props.now).toLowerCase()
}

function interactive(slot: DoseSlot): boolean {
  const s = effectiveDoseStatus(slot, props.now)
  return s === 'PENDIENTE' || s === 'ATRASADA'
}

function isToday(d: Date): boolean {
  return sameDay(d, props.now)
}

// ── Drag & drop nativo ──
const dragging = ref<{ order: OrderVM; slot: DoseSlot } | null>(null)
const dragOver = ref<string | null>(null) // `${dayIso}-${hour}`

function onDragStart(e: Entry, ev: DragEvent) {
  if (!interactive(e.slot)) {
    ev.preventDefault()
    return
  }
  // setData + effectAllowed son necesarios para que el drag inicie en todos los navegadores.
  ev.dataTransfer?.setData('text/plain', e.slot.id)
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
  dragging.value = { order: e.order, slot: e.slot }
}

function onDragEnd() {
  dragging.value = null
  dragOver.value = null
}

// ── Auto-centrado en la hora actual ──
const scrollEl = ref<HTMLElement | null>(null)

function centerOnNow() {
  const el = scrollEl.value
  if (!el) return
  const hour = props.now.getHours()
  const row = el.querySelector<HTMLElement>(`[data-hour="${hour}"]`)
  if (!row) return
  const rowRect = row.getBoundingClientRect()
  const contRect = el.getBoundingClientRect()
  el.scrollTop += rowRect.top - contRect.top - el.clientHeight / 2 + rowRect.height / 2
}

onMounted(() => nextTick(centerOnNow))
watch(
  () => [props.weekStart, props.now, hasEntries.value],
  () => nextTick(centerOnNow),
)

function onDrop(dayIso: string, hour: number) {
  const d = dragging.value
  dragOver.value = null
  dragging.value = null
  if (!d) return
  const origHour = Number(normalizeTime(d.slot.time).split(':')[0]) || 0
  // Conserva los minutos originales; solo cambia hora/día.
  const origMinutes = normalizeTime(d.slot.time).split(':')[1] ?? '00'
  if (dayIso === d.slot.date && hour === origHour) return
  const newTime = `${String(hour).padStart(2, '0')}:${origMinutes}`
  emit('moverequest', d.order, d.slot.id, dayIso, newTime)
}
</script>

<template>
  <div class="wrap">
    <div v-if="!hasEntries" class="empty">No hay tomas programadas en esta semana.</div>
    <div v-else ref="scrollEl" class="scroll">
      <div class="grid" :style="{ gridTemplateColumns: `64px repeat(7, minmax(96px, 1fr))` }">
        <div class="corner" />
        <div v-for="(d, i) in days" :key="`h${i}`" class="dayhead" :class="{ today: isToday(d) }">
          <span class="dow">{{ WEEKDAYS_SHORT[i] }}</span>
          <span class="dnum">{{ d.getDate() }}</span>
        </div>

        <template v-for="hour in HOURS" :key="`r${hour}`">
          <div class="hourcell" :data-hour="hour">{{ String(hour).padStart(2, '0') }}:00</div>
          <div
            v-for="cell in dayCells"
            :key="`c${hour}-${cell.iso}`"
            class="cell"
            :class="{
              today: isToday(cell.date),
              dropover: dragOver === `${cell.iso}-${hour}`,
            }"
            @dragover.prevent="dragOver = `${cell.iso}-${hour}`"
            @dragleave="dragOver = null"
            @drop.prevent="onDrop(cell.iso, hour)"
          >
            <span
              v-for="e in chipsAt(cell.iso, hour)"
              :key="e.slot.id"
              class="chip"
              :class="[statusOf(e.slot), { proc: e.order.kind === 'proc' }]"
              :draggable="interactive(e.slot)"
              :title="
                statusOf(e.slot) === 'aplicada'
                  ? `${e.order.name} · aplicada ${e.slot.givenAt ?? ''} · registro no editable`
                  : `${e.order.name}${e.order.kind === 'med' && e.order.dose ? ' · ' + e.order.dose : ''} · ${normalizeTime(e.slot.time)}`
              "
              @click="interactive(e.slot) && emit('apply', e.order, e.slot.id)"
              @dragstart="onDragStart(e, $event)"
              @dragend="onDragEnd"
            >
              <Lock v-if="statusOf(e.slot) === 'aplicada'" :size="10" :stroke-width="2.4" />
              <span class="chip-name">{{ e.order.name }}</span>
            </span>
          </div>
        </template>
      </div>
    </div>

    <div class="legend">
      <span><i class="sw aplicada" /> Aplicada</span>
      <span><i class="sw pendiente" /> Pendiente</span>
      <span><i class="sw atrasada" /> Atrasada</span>
      <span><i class="sw proc" /> Procedimiento</span>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  overflow: hidden;
}

.scroll {
  max-height: clamp(420px, 60vh, 680px);
  overflow: auto;
}

.grid {
  display: grid;
  gap: 1px;
  background: var(--warm-200);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  overflow: hidden;
  min-width: max-content;
}

.corner {
  background: var(--warm-100);
}

.dayhead {
  background: var(--warm-100);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.dayhead.today {
  background: var(--amatista-100);
}

.dow {
  font-size: 11px;
  color: var(--warm-600);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.dnum {
  font-size: 14px;
  font-weight: 600;
  color: var(--warm-900);
}

.hourcell {
  background: var(--warm-100);
  padding: 8px 6px;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--warm-600);
  text-align: right;
}

.cell {
  background: var(--warm-50);
  min-height: 36px;
  padding: 4px 5px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cell.today {
  background: oklch(98% 0.02 var(--hue));
}

.cell.dropover {
  background: var(--amatista-100);
  outline: 2px dashed var(--amatista-500);
  outline-offset: -2px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
}

.chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip.aplicada {
  background: var(--success-50);
  color: oklch(40% 0.13 150deg);
  cursor: default;
}

.chip.pendiente {
  background: var(--warm-50);
  color: var(--warm-700);
  border: 1px solid var(--warm-300);
  cursor: pointer;
}

.chip.pendiente:hover {
  border-color: var(--amatista-500);
}

.chip.atrasada {
  background: var(--danger-50);
  color: var(--danger-700);
  border: 1px solid var(--danger-300);
  cursor: pointer;
}

/* Procedimientos pendientes: tinte teal para distinguirlos de los medicamentos.
   Aplicada (verde) y atrasada (rojo) usan el color de estado, igual que los meds. */
.chip.proc.pendiente {
  background: oklch(94% 0.05 200deg);
  color: oklch(42% 0.1 220deg);
  border-color: oklch(85% 0.07 210deg);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--warm-600);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sw {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  display: inline-block;
}
.sw.aplicada {
  background: oklch(80% 0.1 150deg);
}
.sw.pendiente {
  background: var(--warm-50);
  border: 1px solid var(--warm-300);
}
.sw.atrasada {
  background: oklch(80% 0.12 25deg);
}
.sw.proc {
  background: oklch(80% 0.07 210deg);
}
</style>

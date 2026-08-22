<script setup lang="ts">
import { computed } from 'vue'
import {
  addDays,
  isoFromDate,
  sameDay,
  startOfWeek,
  WEEKDAYS_SHORT,
} from '../composables/dateUtils'
import AgendaEventChip from './AgendaEventChip.vue'
import AppointmentChip from './AppointmentChip.vue'
import { indexItemsByDay, type AgendaItem } from '../types/agenda'
import type { AgendaEvent } from '../types/agenda'
import type { AppointmentResponse } from '../types/appointment'

const props = defineProps<{
  cursor: Date
  items: AgendaItem[]
}>()

const emit = defineEmits<{
  'day-click': [d: Date]
  'appointment-click': [appt: AppointmentResponse]
  'event-click': [ev: AgendaEvent]
}>()

const today = new Date()

const days = computed<Date[]>(() => {
  const start = startOfWeek(props.cursor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

function countLabel(n: number): string {
  return n === 0 ? 'Sin citas' : n === 1 ? '1 cita' : `${n} citas`
}

const isos = computed<string[]>(() => days.value.map(isoFromDate))

/** Índice único por render. Expande los rangos clínicos: ver `indexItemsByDay`. */
const byDay = computed(() => indexItemsByDay(props.items, isos.value))

/** Referencia estable para los días sin items: evita crear un array nuevo por columna. */
const EMPTY: AgendaItem[] = []

/** Una pasada por columna, sin llamadas a función en la plantilla. */
const cells = computed(() =>
  days.value.map((day, i) => {
    const iso = isos.value[i] as string
    const items = byDay.value.get(iso) ?? EMPTY
    return {
      iso,
      day,
      weekday: WEEKDAYS_SHORT[i] ?? '',
      items,
      countLabel: countLabel(items.length),
      isToday: sameDay(day, today),
    }
  }),
)
</script>

<template>
  <div class="week">
    <div class="header-row">
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        class="header-cell ds-stack"
        :class="{ today: cell.isToday }"
        @click="emit('day-click', cell.day)"
      >
        <div class="weekday">{{ cell.weekday }}</div>
        <div class="day-number" :class="{ today: cell.isToday }">
          {{ cell.day.getDate() }}
        </div>
        <div class="day-count">{{ cell.countLabel }}</div>
      </button>
    </div>
    <div class="grid">
      <div
        v-for="cell in cells"
        :key="cell.iso"
        class="col ds-stack"
        :class="{ today: cell.isToday }"
      >
        <div class="events ds-stack">
          <template v-for="it in cell.items" :key="it.id">
            <AppointmentChip
              v-if="it.kind === 'appointment'"
              :appt="it.appt"
              variant="week"
              @click="emit('appointment-click', it.appt)"
            />
            <AgendaEventChip
              v-else
              :event="it.event"
              dense
              @click="emit('event-click', it.event)"
            />
          </template>
          <div v-if="cell.items.length === 0" class="empty">—</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.week {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: auto hidden;
  -webkit-overflow-scrolling: touch;
}

.header-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}

.header-cell {
  align-items: center;
  padding: var(--space-10) var(--space-8);
  gap: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
}

.header-cell:hover {
  background: var(--warm-150);
}

.weekday {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--warm-600);
  text-transform: uppercase;
}

.day-number {
  font-size: 16px;
  font-weight: 600;
  color: var(--warm-800);
}

.day-number.today {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--amatista-700);
  color: white;
  display: grid;
  place-items: center;
}

.day-count {
  font-size: 10.5px;
  color: var(--warm-500);
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  min-height: 600px;
}

.col {
  align-items: stretch;
  padding: var(--space-10) var(--space-8);
  background: var(--warm-50);
  border-right: 1px solid var(--warm-150);
}

.col:nth-child(7n) {
  border-right: none;
}

.col.today {
  background: var(--amatista-50);
}

.events {
  gap: var(--space-4);
}

.empty {
  text-align: center;
  color: var(--warm-400);
  font-size: 12px;
  padding-top: 12px;
}
</style>

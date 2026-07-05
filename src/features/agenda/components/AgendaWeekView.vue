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
import type { AgendaEvent } from '../types/agenda'

const props = defineProps<{
  cursor: Date
  events: AgendaEvent[]
}>()

const emit = defineEmits<{
  'day-click': [d: Date]
  'event-click': [ev: AgendaEvent]
}>()

const today = new Date()

const days = computed<Date[]>(() => {
  const start = startOfWeek(props.cursor)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
})

function eventsOn(day: Date): AgendaEvent[] {
  const iso = isoFromDate(day)
  return props.events.filter((ev) => {
    if (ev.endDate && ev.endDate !== ev.date) {
      return iso >= ev.date && iso <= ev.endDate
    }
    return ev.date === iso
  })
}
</script>

<template>
  <div class="week">
    <div class="header-row">
      <div
        v-for="(day, i) in days"
        :key="i"
        class="header-cell"
        :class="{ today: sameDay(day, today) }"
      >
        <div class="weekday">{{ WEEKDAYS_SHORT[i] }}</div>
        <div class="day-number" :class="{ today: sameDay(day, today) }">
          {{ day.getDate() }}
        </div>
      </div>
    </div>
    <div class="grid">
      <button
        v-for="(day, i) in days"
        :key="i"
        type="button"
        class="cell"
        :class="{ today: sameDay(day, today) }"
        @click="emit('day-click', day)"
      >
        <div class="events">
          <AgendaEventChip
            v-for="ev in eventsOn(day)"
            :key="ev.id"
            :event="ev"
            dense
            @click="emit('event-click', ev)"
          />
          <div v-if="eventsOn(day).length === 0" class="empty">—</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.week {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow-x: auto;
  overflow-y: hidden;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 8px;
  gap: 4px;
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
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  min-height: 600px;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px 8px;
  background: var(--warm-50);
  border: none;
  border-right: 1px solid var(--warm-150);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease;
}
.cell:nth-child(7n) {
  border-right: none;
}
.cell:hover {
  background: var(--warm-100);
}
.cell.today {
  background: var(--amatista-50);
}
.cell.today:hover {
  background: var(--amatista-100);
}
.events {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.empty {
  text-align: center;
  color: var(--warm-400);
  font-size: 12px;
  padding-top: 12px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import {
  addDays,
  isoFromDate,
  sameDay,
  startOfMonth,
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
  const start = startOfWeek(startOfMonth(props.cursor))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})

const cursorMonth = computed(() => props.cursor.getMonth())

function eventsOn(day: Date): AgendaEvent[] {
  const iso = isoFromDate(day)
  return props.events.filter((ev) => {
    if (ev.endDate && ev.endDate !== ev.date) {
      return iso >= ev.date && iso <= ev.endDate
    }
    return ev.date === iso
  })
}

const MAX_VISIBLE = 3
</script>

<template>
  <div class="month">
    <div class="weekday-header">
      <div v-for="wd in WEEKDAYS_SHORT" :key="wd" class="weekday">{{ wd }}</div>
    </div>
    <div class="grid">
      <button
        v-for="(day, i) in days"
        :key="i"
        type="button"
        class="cell"
        :class="{
          'other-month': day.getMonth() !== cursorMonth,
          today: sameDay(day, today),
        }"
        @click="emit('day-click', day)"
      >
        <div class="day-number">{{ day.getDate() }}</div>
        <div class="events">
          <AgendaEventChip
            v-for="ev in eventsOn(day).slice(0, MAX_VISIBLE)"
            :key="ev.id"
            :event="ev"
            dense
            @click="emit('event-click', ev)"
          />
          <div
            v-if="eventsOn(day).length > MAX_VISIBLE"
            class="more"
          >
            +{{ eventsOn(day).length - MAX_VISIBLE }} más
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.month {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.weekday {
  padding: 10px;
  text-align: center;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--warm-600);
  text-transform: uppercase;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: minmax(110px, auto);
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  padding: 8px 8px 10px;
  background: var(--warm-50);
  border: none;
  border-right: 1px solid var(--warm-150);
  border-bottom: 1px solid var(--warm-150);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  min-height: 110px;
  transition: background 0.12s ease;
}
.cell:hover {
  background: var(--warm-100);
}
.cell:nth-child(7n) {
  border-right: none;
}
.cell.other-month {
  background: var(--warm-100);
  opacity: 0.55;
}
.cell.today {
  background: var(--amatista-50);
}
.cell.today:hover {
  background: var(--amatista-100);
}
.day-number {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--warm-800);
}
.cell.today .day-number {
  color: var(--amatista-700);
}
.events {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.more {
  font-size: 11px;
  color: var(--warm-600);
  padding: 2px 4px;
  font-weight: 500;
}
</style>

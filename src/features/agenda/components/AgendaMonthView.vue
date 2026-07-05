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
        <div class="day-num">
          <span :class="{ 'today-marker': sameDay(day, today) }">{{ day.getDate() }}</span>
          <span v-if="eventsOn(day).length > 0" class="day-count">{{ eventsOn(day).length }}</span>
        </div>
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
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
}
.weekday {
  padding: 10px 12px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  text-transform: uppercase;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
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
.day-num {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-700);
  margin-bottom: 2px;
}
.today-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--amatista-700);
  color: white;
  font-weight: 600;
}
.day-count {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  border-radius: 4px;
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

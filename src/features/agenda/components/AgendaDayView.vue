<script setup lang="ts">
import { computed } from 'vue'
import {
  EVENT_TYPES,
  TYPE_COLORS,
} from '@/features/historia-clinica/constants/eventTypes'
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'
import type { AgendaEvent } from '../types/agenda'
import { isoFromDate, formatDayLong } from '../composables/dateUtils'

const props = defineProps<{
  cursor: Date
  events: AgendaEvent[]
}>()

const emit = defineEmits<{ 'event-click': [ev: AgendaEvent] }>()

const dayEvents = computed<AgendaEvent[]>(() => {
  const iso = isoFromDate(props.cursor)
  return props.events.filter((ev) => {
    if (ev.endDate && ev.endDate !== ev.date) {
      return iso >= ev.date && iso <= ev.endDate
    }
    return ev.date === iso
  })
})

const summary = computed(() => {
  const map = new Map<ClinicalEventType, number>()
  for (const ev of dayEvents.value) {
    map.set(ev.type, (map.get(ev.type) ?? 0) + 1)
  }
  return Array.from(map.entries())
})

const dayLabel = computed(() => formatDayLong(props.cursor))
</script>

<template>
  <div class="day-view">
    <header class="day-header">
      <h3 class="day-title">{{ dayLabel }}</h3>
      <div v-if="summary.length > 0" class="summary">
        <span
          v-for="[type, count] in summary"
          :key="type"
          class="summary-chip"
          :style="{
            background: TYPE_COLORS[EVENT_TYPES[type].color].bg,
            color: TYPE_COLORS[EVENT_TYPES[type].color].fg,
          }"
        >
          <span aria-hidden="true">{{ EVENT_TYPES[type].icon }}</span>
          {{ count }} {{ EVENT_TYPES[type].label }}
        </span>
      </div>
    </header>

    <div v-if="dayEvents.length === 0" class="empty">
      Sin eventos programados para este día.
    </div>

    <ul v-else class="list">
      <li v-for="ev in dayEvents" :key="ev.id" class="row">
        <button type="button" class="row-btn" @click="emit('event-click', ev)">
          <span
            class="dot"
            :style="{ background: TYPE_COLORS[EVENT_TYPES[ev.type].color].dot }"
          />
          <span class="icon" aria-hidden="true">{{ EVENT_TYPES[ev.type].icon }}</span>
          <span class="text">
            <span class="title">{{ ev.title }}</span>
            <span v-if="ev.subtitle" class="subtitle">{{ ev.subtitle }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.day-view {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 18px 20px;
  min-height: 600px;
}
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--warm-200);
}
.day-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 400;
  color: var(--warm-900);
  letter-spacing: -0.01em;
  text-transform: capitalize;
}
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.summary-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
}
.empty {
  padding: 24px;
  text-align: center;
  background: var(--warm-100);
  border-radius: 9px;
  color: var(--warm-500);
  font-size: 13px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.row {
  display: block;
}
.row-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.row-btn:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-200);
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}
.icon {
  font-size: 18px;
  line-height: 1;
}
.text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
}
.subtitle {
  font-size: 12px;
  color: var(--warm-600);
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import EventCard from './EventCard.vue'
import { formatMonthLabel } from '../composables/format'
import { EVENT_TYPE_ROUTE } from '../constants/eventTypes'
import type { ClinicalEvent } from '../types/historia'

interface Props {
  monthKey: string
  events: ClinicalEvent[]
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'select', event: ClinicalEvent): void }>()

const monthLabel = computed(() => formatMonthLabel(props.monthKey))
const countLabel = computed(() =>
  props.events.length === 1 ? '1 evento' : `${props.events.length} eventos`,
)

function isNavigable(eventType: ClinicalEvent['eventType']): boolean {
  return Boolean(EVENT_TYPE_ROUTE[eventType])
}
</script>

<template>
  <section class="month-group">
    <header class="month-head">
      <span class="label">{{ monthLabel }}</span>
      <span class="divider" />
      <span class="count">{{ countLabel }}</span>
    </header>
    <div class="timeline">
      <div class="rail" aria-hidden="true" />
      <EventCard
        v-for="(ev, idx) in events"
        :key="`${ev.eventType}-${ev.sourceId}-${idx}`"
        :event="ev"
        :navigable="isNavigable(ev.eventType)"
        @select="emit('select', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.month-group {
  margin-bottom: 24px;
}
.month-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.label {
  font-size: 12px;
  color: var(--warm-500);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 500;
}
.divider {
  flex: 1;
  height: 1px;
  background: var(--warm-200);
}
.count {
  font-size: 12px;
  color: var(--warm-500);
}
.timeline {
  position: relative;
  padding-left: 38px;
}
.rail {
  position: absolute;
  left: 14px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--warm-200);
  border-radius: 1px;
}
</style>

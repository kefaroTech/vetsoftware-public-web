<script setup lang="ts">
import { computed } from 'vue'
import EventCard from './EventCard.vue'
import { formatMonthLabel } from '@/composables/format'
import { EVENT_TYPE_DETAILABLE } from '../constants/eventTypes'
import type { ClinicalEvent } from '../types/historia'

interface Props {
  monthKey: string
  events: ClinicalEvent[]
}
const props = defineProps<Props>()
const emit = defineEmits<(e: 'select', event: ClinicalEvent) => void>()

const monthLabel = computed(() => formatMonthLabel(props.monthKey))
const countLabel = computed(() =>
  props.events.length === 1 ? '1 evento' : `${props.events.length} eventos`,
)

interface TimelineNode {
  parent: ClinicalEvent
  children: ClinicalEvent[]
}

const nodes = computed<TimelineNode[]>(() => {
  const consultationIds = new Set<number>()
  for (const ev of props.events) {
    if (ev.eventType === 'CONSULTATION') consultationIds.add(ev.sourceId)
  }
  const childrenByParent = new Map<number, ClinicalEvent[]>()
  for (const ev of props.events) {
    if (
      ev.eventType !== 'CONSULTATION' &&
      ev.consultationId != null &&
      consultationIds.has(ev.consultationId)
    ) {
      const arr = childrenByParent.get(ev.consultationId) ?? []
      arr.push(ev)
      childrenByParent.set(ev.consultationId, arr)
    }
  }
  const result: TimelineNode[] = []
  for (const ev of props.events) {
    if (ev.eventType === 'CONSULTATION') {
      result.push({ parent: ev, children: childrenByParent.get(ev.sourceId) ?? [] })
    } else if (ev.consultationId != null && consultationIds.has(ev.consultationId)) {
      // skip — already nested under its parent consultation
    } else {
      result.push({ parent: ev, children: [] })
    }
  }
  return result
})

function isNavigable(eventType: ClinicalEvent['eventType']): boolean {
  return EVENT_TYPE_DETAILABLE.has(eventType)
}
</script>

<template>
  <section class="month-group">
    <header class="month-head ds-flex-row">
      <span class="label">{{ monthLabel }}</span>
      <span class="divider" />
      <span class="ds-meta">{{ countLabel }}</span>
    </header>
    <div class="timeline">
      <div class="rail" aria-hidden="true" />
      <template
        v-for="(node, idx) in nodes"
        :key="`${node.parent.eventType}-${node.parent.sourceId}-${idx}`"
      >
        <EventCard
          :event="node.parent"
          :navigable="isNavigable(node.parent.eventType)"
          @select="emit('select', $event)"
        />
        <div v-if="node.children.length > 0" class="children">
          <EventCard
            v-for="child in node.children"
            :key="`${child.eventType}-${child.sourceId}`"
            :event="child"
            :navigable="isNavigable(child.eventType)"
            :nested="true"
            @select="emit('select', $event)"
          />
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.month-group {
  margin-bottom: 24px;
}

/* Resto sobre `.ds-flex-row`: gap propio (10px). */
.month-head {
  gap: var(--space-10);
  margin-bottom: var(--space-10);
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

.children {
  position: relative;
  margin: -4px 0 14px 32px;
  padding-top: 4px;
  padding-left: 18px;
  border-left: 2px solid var(--warm-200);
}
</style>

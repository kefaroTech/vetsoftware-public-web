<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import EventTypeChip from './EventTypeChip.vue'
import { EVENT_TYPES, TYPE_COLORS } from '../constants/eventTypes'
import { formatEventDate } from '../composables/format'
import type { ClinicalEvent } from '../types/historia'

interface Props {
  event: ClinicalEvent
  navigable: boolean
}
const props = defineProps<Props>()
const emit = defineEmits<{ (e: 'select', event: ClinicalEvent): void }>()

const meta = computed(() => EVENT_TYPES[props.event.eventType])
const tokens = computed(() => TYPE_COLORS[meta.value.color])
const dateLabel = computed(() => formatEventDate(props.event.eventDate))

function handleClick() {
  if (props.navigable) emit('select', props.event)
}
</script>

<template>
  <div class="event-row">
    <div
      class="bullet"
      :style="{ background: tokens.bg, color: tokens.fg }"
      :aria-label="meta.label"
    >
      {{ meta.icon }}
    </div>
    <button
      type="button"
      class="card"
      :class="{ navigable }"
      :style="{ '--hover-border': tokens.dot }"
      :disabled="!navigable"
      @click="handleClick"
    >
      <div class="content">
        <div class="head">
          <EventTypeChip :type="event.eventType" />
          <span class="date">{{ dateLabel }}</span>
          <span class="source">#{{ event.sourceId }}</span>
        </div>
        <div class="summary">
          {{ event.summary || 'Sin descripción' }}
        </div>
      </div>
      <ChevronRight
        v-if="navigable"
        :size="16"
        :stroke-width="1.6"
        class="chev"
      />
    </button>
  </div>
</template>

<style scoped>
.event-row {
  position: relative;
  margin-bottom: 10px;
}
.bullet {
  position: absolute;
  left: -31px;
  top: 14px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 14px;
  border: 3px solid var(--warm-100);
}
.card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  width: 100%;
  text-align: left;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  padding: 12px 16px;
  font-family: inherit;
  cursor: default;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.card.navigable {
  cursor: pointer;
}
.card.navigable:hover {
  border-color: var(--hover-border);
}
.content {
  flex: 1;
  min-width: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.date {
  font-size: 12px;
  color: var(--warm-500);
}
.source {
  font-size: 11px;
  color: var(--warm-400);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}
.summary {
  font-size: 13.5px;
  color: var(--warm-800);
  line-height: 1.45;
  word-break: break-word;
}
.chev {
  color: var(--warm-400);
  align-self: center;
  flex-shrink: 0;
}
</style>

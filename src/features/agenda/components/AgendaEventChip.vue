<script setup lang="ts">
import { computed } from 'vue'
import { EVENT_TYPES, TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import type { AgendaEvent } from '../types/agenda'

const props = withDefaults(
  defineProps<{
    event: AgendaEvent
    dense?: boolean
  }>(),
  { dense: false },
)

defineEmits<{ click: [event: AgendaEvent] }>()

const meta = computed(() => EVENT_TYPES[props.event.type])
const tokens = computed(() => TYPE_COLORS[meta.value.color])
</script>

<template>
  <button
    type="button"
    class="chip"
    :class="{ 'chip-dense': dense }"
    :style="{ background: tokens.bg, color: tokens.fg }"
    :title="`${meta.label}${event.subtitle ? ' · ' + event.subtitle : ''}`"
    @click.stop="$emit('click', event)"
  >
    <span class="icon" aria-hidden="true">{{ meta.icon }}</span>
    <span class="label">
      <span class="title">{{ event.title }}</span>
      <span v-if="!dense && event.subtitle" class="subtitle">{{ event.subtitle }}</span>
    </span>
  </button>
</template>

<style scoped>
.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: none;
  text-align: left;
  cursor: pointer;
  width: 100%;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  transition: filter 0.12s ease;
}

.chip:hover {
  filter: brightness(1.02);
}

.chip-dense {
  padding: 3px 6px;
  font-size: 11px;
  border-radius: 6px;
  gap: 5px;
}

.icon {
  flex-shrink: 0;
  font-size: 13px;
  line-height: 1;
}

.chip-dense .icon {
  font-size: 11px;
}

.label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  overflow: hidden;
}

.title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.subtitle {
  font-size: 11.5px;
  font-weight: 400;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

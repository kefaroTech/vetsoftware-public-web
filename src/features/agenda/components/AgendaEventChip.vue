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
    class="chip ds-flex-row"
    :class="{ 'chip-dense': dense }"
    :style="{ background: tokens.bg, color: tokens.fg }"
    :title="`${meta.label}${event.subtitle ? ' · ' + event.subtitle : ''}`"
    @click.stop="$emit('click', event)"
  >
    <span class="icon" aria-hidden="true">{{ meta.icon }}</span>
    <span class="label ds-stack">
      <span class="ds-truncate">{{ event.title }}</span>
      <span v-if="!dense && event.subtitle" class="subtitle ds-truncate">{{ event.subtitle }}</span>
    </span>
  </button>
</template>

<style scoped>
.chip {
  padding: var(--space-10) var(--space-12);
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
  gap: var(--space-2);
  min-width: 0;
  overflow: hidden;
}

.subtitle {
  font-size: var(--text-xs);
  font-weight: var(--weight-normal);
  opacity: 0.85;
}
</style>

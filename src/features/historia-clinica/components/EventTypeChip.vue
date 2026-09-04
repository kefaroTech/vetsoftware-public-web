<script setup lang="ts">
import { computed } from 'vue'
import { EVENT_TYPES, TYPE_COLORS } from '../constants/eventTypes'
import type { ClinicalEventType } from '../types/historia'

interface Props {
  type: ClinicalEventType
  showIcon?: boolean
}
const props = withDefaults(defineProps<Props>(), { showIcon: false })

const meta = computed(() => EVENT_TYPES[props.type])
const tokens = computed(() => TYPE_COLORS[meta.value.color])
</script>

<template>
  <span class="event-chip ds-pill" :style="{ background: tokens.bg, color: tokens.fg }">
    <component
      :is="meta.icon"
      v-if="showIcon"
      :size="12"
      :stroke-width="1.8"
      class="icon"
      aria-hidden="true"
    />
    <span>{{ meta.label }}</span>
  </span>
</template>

<style scoped>
.event-chip {
  gap: var(--space-5);
  padding: var(--space-2) var(--space-9);
  font-size: var(--text-caption);
}

.icon {
  flex-shrink: 0;
}
</style>

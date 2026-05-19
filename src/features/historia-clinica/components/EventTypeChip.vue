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
  <span
    class="event-chip"
    :style="{ background: tokens.bg, color: tokens.fg }"
  >
    <span v-if="showIcon" class="icon">{{ meta.icon }}</span>
    <span>{{ meta.label }}</span>
  </span>
</template>

<style scoped>
.event-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  font-family: inherit;
}
.icon {
  font-size: 12px;
  line-height: 1;
}
</style>

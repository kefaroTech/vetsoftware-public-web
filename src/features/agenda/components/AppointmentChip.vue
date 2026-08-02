<script setup lang="ts">
import { computed } from 'vue'
import {
  APPT_STATUS,
  APPT_TERMINAL,
  APPT_TYPES,
  apptTypeTokens,
  apptTime,
  type AppointmentResponse,
} from '../types/appointment'

const props = defineProps<{
  appt: AppointmentResponse
  variant: 'month' | 'week'
}>()

defineEmits<{ click: [appt: AppointmentResponse] }>()

const typeMeta = computed(() => APPT_TYPES[props.appt.type])
const tokens = computed(() => apptTypeTokens(props.appt.type))
const statusMeta = computed(() => APPT_STATUS[props.appt.status])
const terminal = computed(() => APPT_TERMINAL.has(props.appt.status))
const subject = computed(() => props.appt.animal?.name || props.appt.clientName || 'Sin asignar')
</script>

<template>
  <button
    v-if="variant === 'month'"
    type="button"
    class="chip-dense"
    :style="{
      background: tokens.bg,
      color: tokens.fg,
      borderLeft: `3px solid ${tokens.dot}`,
      opacity: terminal ? 0.6 : 1,
    }"
    @click.stop="$emit('click', appt)"
  >
    <span class="c-time">{{ apptTime(appt.startAt) }}</span>
    <span class="c-title">{{ subject }}</span>
    <span class="c-status-dot" :style="{ background: statusMeta.dot }" />
  </button>

  <button
    v-else
    type="button"
    class="chip-week"
    :style="{
      background: tokens.bg,
      color: tokens.fg,
      borderLeft: `4px solid ${tokens.dot}`,
      opacity: terminal ? 0.62 : 1,
    }"
    @click.stop="$emit('click', appt)"
  >
    <span class="w-time">{{ apptTime(appt.startAt) }}</span>
    <span class="w-body">
      <span class="w-line"
        ><strong>{{ typeMeta.icon }} {{ subject }}</strong></span
      >
      <span class="w-sub">{{ typeMeta.label }}</span>
    </span>
  </button>
</template>

<style scoped>
.chip-dense {
  display: flex;
  align-items: center;
  gap: 5px;
  width: 100%;
  padding: 3px 6px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 500;
  text-align: left;
  min-width: 0;
}

.c-time {
  font-family: var(--font-mono);
  font-weight: 600;
  flex-shrink: 0;
}

.c-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.c-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-left: auto;
  flex-shrink: 0;
}

.chip-week {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: filter 0.12s ease;
}

.chip-week:hover {
  filter: brightness(1.02);
}

.w-time {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.w-body {
  flex: 1;
  min-width: 0;
}

.w-line {
  display: block;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.w-sub {
  display: block;
  font-size: 10.5px;
  opacity: 0.8;
}
</style>

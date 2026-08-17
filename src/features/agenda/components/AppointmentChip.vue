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
import { useAppointmentDuration } from '../composables/useAppointmentDuration'

const props = defineProps<{
  appt: AppointmentResponse
  variant: 'month' | 'week'
}>()

defineEmits<{ click: [appt: AppointmentResponse] }>()

const { rangeOf, endOf } = useAppointmentDuration()
/**
 * En la vista MES el chip mide 11px y ya reparte hora + asunto + punto de estado en el ancho
 * de una celda del calendario: meter ahí "09:00–09:45" empuja el nombre del paciente fuera y
 * cambia el dato útil por uno accesorio. El rango va al tooltip, y a la vista semana —que sí
 * tiene alto— apilado bajo la hora de inicio.
 */
const range = computed(() => rangeOf(props.appt))
const endTime = computed(() => endOf(props.appt))

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
    class="chip-dense ds-flex-row"
    :style="{
      background: tokens.bg,
      color: tokens.fg,
      borderLeft: `3px solid ${tokens.dot}`,
      opacity: terminal ? 0.6 : 1,
    }"
    :title="`${range} · ${subject}`"
    @click.stop="$emit('click', appt)"
  >
    <span class="c-time">{{ apptTime(appt.startAt) }}</span>
    <span class="c-title ds-truncate">{{ subject }}</span>
    <span class="c-status-dot ds-status-dot" :style="{ background: statusMeta.dot }" />
  </button>

  <button
    v-else
    type="button"
    class="chip-week ds-flex-row"
    :style="{
      background: tokens.bg,
      color: tokens.fg,
      borderLeft: `4px solid ${tokens.dot}`,
      opacity: terminal ? 0.62 : 1,
    }"
    :title="range"
    @click.stop="$emit('click', appt)"
  >
    <span class="w-time ds-stack">
      <span class="w-time-start">{{ apptTime(appt.startAt) }}</span>
      <span class="w-time-end">–{{ endTime }}</span>
    </span>
    <span class="ds-flex-fill">
      <span class="w-line ds-truncate"
        ><strong>{{ typeMeta.icon }} {{ subject }}</strong></span
      >
      <span class="w-sub">{{ typeMeta.label }}</span>
    </span>
  </button>
</template>

<style scoped>
/* Resto sobre `.ds-flex-row`: gap propio (5px, fuera del catálogo 8/12). */
.chip-dense {
  gap: var(--space-5);
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
  min-width: 0;
}

/* Resto sobre `.ds-status-dot`: este punto se empuja al final de la fila. */
.c-status-dot {
  margin-left: auto;
}

.chip-week {
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
  align-items: flex-start;
  font-family: var(--font-mono);
  flex-shrink: 0;
  line-height: 1.25;
}

.w-time-start {
  font-size: 12px;
  font-weight: 600;
}

.w-time-end {
  font-size: 10px;
  font-weight: 500;
  opacity: 0.75;
  white-space: nowrap;
}

.w-line {
  display: block;
  font-size: var(--text-xs);
}

.w-sub {
  display: block;
  font-size: 10.5px;
  opacity: 0.8;
}
</style>

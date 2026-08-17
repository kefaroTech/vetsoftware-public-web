<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import AppointmentTypeChip from './AppointmentTypeChip.vue'
import AppointmentStatusPill from './AppointmentStatusPill.vue'
import AppointmentVetBadge from './AppointmentVetBadge.vue'
import {
  APPT_TYPES,
  APPT_TERMINAL,
  apptTypeTokens,
  apptTime,
  type AppointmentResponse,
} from '../types/appointment'
import { useAppointmentDuration } from '../composables/useAppointmentDuration'

const props = defineProps<{ appt: AppointmentResponse }>()
defineEmits<{ click: [appt: AppointmentResponse] }>()

const { durationOf, endOf } = useAppointmentDuration()
const endTime = computed(() => endOf(props.appt))
const durationLabel = computed(() => `${durationOf(props.appt)} min`)

const typeMeta = computed(() => APPT_TYPES[props.appt.type])
const tokens = computed(() => apptTypeTokens(props.appt.type))
const terminal = computed(() => APPT_TERMINAL.has(props.appt.status))
const cancelled = computed(() => props.appt.status === 'CANCELLED')
const hasClash = computed(() => (props.appt.overlappingAppointmentIds?.length ?? 0) > 0)
const subject = computed(() => props.appt.animal?.name || props.appt.clientName || 'Sin asignar')
const secondary = computed(() => {
  if (props.appt.animal) return props.appt.owner?.name || 'Dueño s/registro'
  return props.appt.clientPhone || 'Contacto libre'
})
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{ terminal, cancelled }"
    :style="{ borderLeftColor: tokens.dot }"
    @click="$emit('click', appt)"
  >
    <!--
      El rango va apilado, no en una línea: "09:00–09:45" seguido no cabe en la columna de
      hora, y ensancharla hasta que quepa le come el ancho al asunto de la cita, que es lo que
      el recepcionista lee primero.
    -->
    <div
      class="card-time ds-stack"
      :title="`${apptTime(appt.startAt)}–${endTime} · ${durationLabel}`"
    >
      <span class="hh">{{ apptTime(appt.startAt) }}</span>
      <span class="hh-end">–{{ endTime }}</span>
      <span class="type-ic" aria-hidden="true">{{ typeMeta.icon }}</span>
    </div>
    <div class="card-main">
      <div class="line1 ds-flex-row">
        <span class="title ds-strong">{{ subject }}</span>
        <AppointmentTypeChip :type="appt.type" />
        <span v-if="hasClash" class="clash-flag">
          <AlertTriangle :size="11" :stroke-width="1.8" /> Choque
        </span>
      </div>
      <div class="line2 ds-flex-row">
        <span class="secondary">{{ secondary }}</span>
        <template v-if="appt.notes">
          <span class="dot-sep">·</span>
          <span class="notes">{{ appt.notes }}</span>
        </template>
      </div>
    </div>
    <div class="card-right ds-stack">
      <AppointmentStatusPill :status="appt.status" />
      <AppointmentVetBadge :employee-id="appt.employee.id" :name="appt.employee.name" />
    </div>
  </button>
</template>

<style scoped>
.card {
  display: grid;

  /* 56px: lo justo para "09:00" a 15px y "–09:45" a 11px, cada uno en su línea. */
  grid-template-columns: 56px 1fr auto;
  gap: 14px;
  align-items: center;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-left: 4px solid var(--warm-300);
  border-radius: 11px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  width: 100%;
  transition:
    border-color 0.12s,
    box-shadow 0.12s,
    transform 0.06s;
}

.card:hover {
  box-shadow: 0 4px 16px -8px rgb(40 20 60 / 25%);
}

.card:active {
  transform: translateY(1px);
}

.card.terminal {
  opacity: 0.62;
}

.card.cancelled .title {
  text-decoration: line-through;
  text-decoration-color: var(--warm-400);
}

.card-time {
  align-items: flex-start;
  gap: var(--space-2);
}

.hh {
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 600;
  color: var(--warm-900);
  letter-spacing: -0.02em;
}

.hh-end {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  color: var(--warm-500);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.type-ic {
  font-size: 15px;
  margin-top: 1px;
}

.card-main {
  min-width: 0;
}

.line1 {
  flex-wrap: wrap;
}

.title {
  font-size: var(--text-lg);
}

.clash-flag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 5px;
  background: oklch(95% 0.07 80deg);
  color: oklch(45% 0.14 60deg);
}

/* Resto sobre `.ds-flex-row`: gap propio (7px, fuera del catálogo 8/12). */
.line2 {
  margin-top: var(--space-3);
  gap: var(--space-7);
  color: var(--warm-600);
  font-size: var(--text-sm);
  flex-wrap: wrap;
}

.secondary {
  color: var(--warm-500);
}

.dot-sep {
  color: var(--warm-300);
}

.notes {
  color: var(--warm-500);
}

.card-right {
  align-items: flex-end;
  gap: var(--space-6);
}
</style>

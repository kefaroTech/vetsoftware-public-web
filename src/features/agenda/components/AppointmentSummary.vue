<script setup lang="ts">
import { computed } from 'vue'
import { APPT_TERMINAL, type AppointmentResponse } from '../types/appointment'

const props = defineProps<{ appointments: AppointmentResponse[] }>()

const stats = computed(() => {
  const list = props.appointments
  const count = (fn: (a: AppointmentResponse) => boolean) => list.filter(fn).length
  return [
    { label: 'Citas del día', value: list.length, sub: 'agendadas' },
    {
      label: 'Pendientes',
      value: count((a) => ['REQUESTED', 'CONFIRMED', 'ARRIVED'].includes(a.status)),
      sub: 'por atender',
    },
    {
      label: 'En curso',
      value: count((a) => a.status === 'IN_PROGRESS'),
      sub: 'en consultorio',
    },
    {
      label: 'Cerradas',
      value: count((a) => APPT_TERMINAL.has(a.status)),
      sub: 'completadas / canceladas',
    },
  ]
})
</script>

<template>
  <div class="summary">
    <div v-for="s in stats" :key="s.label" class="stat">
      <div class="stat-label ds-hint">{{ s.label }}</div>
      <div class="stat-value">{{ s.value }}</div>
      <div class="stat-sub ds-hint">{{ s.sub }}</div>
    </div>
  </div>
</template>

<style scoped>
/* 4 columnas con colapso a 2: sin equivalente en el design system. */
.summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-10);
}

.stat {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 13px 15px;
}

.stat-label {
  margin-bottom: var(--space-5);
}

.stat-value {
  font-size: 25px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--warm-900);
}

.stat-sub {
  margin-top: var(--space-3);
}

@media (width <= 820px) {
  .summary {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

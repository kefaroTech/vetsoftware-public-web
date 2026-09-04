<script setup lang="ts">
import { computed } from 'vue'
import StatCard from './StatCard.vue'
import {
  apptTime,
  type AppointmentResponse,
  type AppointmentStatus,
} from '@/features/agenda/types/appointment'
import { appointmentSubject } from '../../composables/useTodayAgenda'

const props = defineProps<{
  appointments: AppointmentResponse[]
}>()

const PENDING: readonly AppointmentStatus[] = ['REQUESTED', 'CONFIRMED', 'ARRIVED']

function nowHhmm(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

const cards = computed(() => {
  const list = props.appointments
  const inProgress = list.filter((a) => a.status === 'IN_PROGRESS')
  const pending = list.filter((a) => PENDING.includes(a.status))
  // Todas las citas de la lista son del mismo día, así que comparar "HH:mm"
  // como texto las ordena igual que comparar instantes.
  const hhmm = nowHhmm()
  const next = pending.find((a) => apptTime(a.startAt) >= hhmm)
  // Con dos o más en curso no hay «la» que está pasando, y quedarse con una
  // sería elegir por el usuario.
  const current = inProgress.length === 1 ? inProgress[0] : undefined

  return [
    { label: 'Citas hoy', value: list.length, sub: '', tone: 'neutral' as const },
    {
      label: 'En curso',
      value: inProgress.length,
      sub: current ? `${appointmentSubject(current)} · ${apptTime(current.startAt)}`.trim() : '',
      tone: 'amatista' as const,
    },
    {
      label: 'Pendientes',
      value: pending.length,
      sub: next ? `Próxima ${apptTime(next.startAt)}` : '',
      tone: 'neutral' as const,
    },
    {
      label: 'Completadas',
      value: list.filter((a) => a.status === 'COMPLETED').length,
      sub: '',
      tone: 'neutral' as const,
    },
  ]
})
</script>

<template>
  <div class="stats-row">
    <StatCard
      v-for="card in cards"
      :key="card.label"
      :label="card.label"
      :value="card.value"
      :sub="card.sub"
      :tone="card.tone"
    />
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

@media (width <= 1280px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (width <= 440px) {
  .stats-row {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import StatCard from './StatCard.vue'
import type { MockDayStats } from '../../data/mock'

const props = defineProps<{
  stats: MockDayStats
}>()

const cards = [
  {
    label: 'Consultas hoy',
    value: props.stats.total,
    sub: '+2 vs ayer',
    tone: 'ok' as const,
  },
  {
    label: 'En curso',
    value: props.stats.inProgress,
    sub: 'Luna · 09:30',
    tone: 'amatista' as const,
  },
  {
    label: 'Pendientes',
    value: props.stats.pending,
    sub: 'Próxima 11:00',
    tone: 'neutral' as const,
  },
  {
    label: 'Completadas',
    value: props.stats.completed,
    sub: 'esta mañana',
    tone: 'neutral' as const,
  },
]
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

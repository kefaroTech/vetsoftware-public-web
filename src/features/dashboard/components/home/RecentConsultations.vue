<script setup lang="ts">
import { PawPrint } from 'lucide-vue-next'
import ConsultationStatusPill from './ConsultationStatusPill.vue'
import type { MockConsultation } from '../../data/mock'

defineProps<{
  consultations: MockConsultation[]
}>()
</script>

<template>
  <section>
    <header class="header">
      <h3 class="title">Consultas recientes</h3>
      <a href="#" class="link">Ver todas →</a>
    </header>

    <div class="list">
      <article
        v-for="(c, idx) in consultations"
        :key="c.id"
        class="row"
        :class="{ last: idx === consultations.length - 1 }"
      >
        <div class="avatar">
          <PawPrint :size="16" :stroke-width="1.5" />
        </div>
        <div class="patient">
          <div class="name">{{ c.patient.name }}</div>
          <div class="meta">{{ c.patient.species }} · {{ c.patient.ageYears }} a</div>
        </div>
        <div class="cell">{{ c.patient.ownerName }}</div>
        <div class="cell">{{ c.reason }}</div>
        <div class="cell">{{ c.dayLabel }} · {{ c.timeLabel }}</div>
        <ConsultationStatusPill :status="c.status" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.title {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-800);
}
.link {
  font-size: 12px;
  color: var(--amatista-700);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}
.list {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}
.row {
  display: grid;
  grid-template-columns: 32px 1.4fr 1fr 1fr 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid var(--warm-150);
}
.row.last {
  border-bottom: none;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: flex;
  align-items: center;
  justify-content: center;
}
.patient {
  display: flex;
  flex-direction: column;
}
.name {
  font-weight: 500;
  color: var(--warm-900);
}
.meta {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
}
.cell {
  font-size: 12.5px;
  color: var(--warm-600);
}
</style>

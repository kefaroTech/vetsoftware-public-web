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
    <header class="header ds-block-head">
      <h3 class="title">Consultas recientes</h3>
      <a href="#" class="link">Ver todas →</a>
    </header>

    <div class="ds-frame">
      <article
        v-for="(c, idx) in consultations"
        :key="c.id"
        class="row"
        :class="{ last: idx === consultations.length - 1 }"
      >
        <div class="avatar ds-tone--accent">
          <PawPrint :size="16" :stroke-width="1.5" />
        </div>
        <div class="ds-stack">
          <div class="ds-item-label">{{ c.patient.name }}</div>
          <div class="meta ds-hint">{{ c.patient.species }} · {{ c.patient.ageYears }} a</div>
        </div>
        <div class="ds-meta-dark ds-meta-dark--sm">{{ c.patient.ownerName }}</div>
        <div class="ds-meta-dark ds-meta-dark--sm">{{ c.reason }}</div>
        <div class="ds-meta-dark ds-meta-dark--sm">{{ c.dayLabel }} · {{ c.timeLabel }}</div>
        <ConsultationStatusPill :status="c.status" />
      </article>
    </div>
  </section>
</template>

<style scoped>
/* Residuo sobre `.ds-block-head`: 14px de hueco, no los 10 de la primitiva. */
.header {
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Único añadido sobre `.ds-hint`: 1px, no los 2px de `--spaced`. */
.meta {
  margin-top: 1px;
}
</style>

<script setup lang="ts">
import GreetingHeader from '../components/home/GreetingHeader.vue'
import StatsRow from '../components/home/StatsRow.vue'
import CtaPrimary from '../components/home/CtaPrimary.vue'
import CtaSecondary from '../components/home/CtaSecondary.vue'
import RecentConsultations from '../components/home/RecentConsultations.vue'
import { mockUser, mockDayStats, mockRecentConsultations } from '../data/mock'
</script>

<template>
  <GreetingHeader :first-name="mockUser.firstName" :scheduled-today="mockDayStats.total" />
  <StatsRow :stats="mockDayStats" />
  <div class="cta-row">
    <CtaPrimary />
    <CtaSecondary />
  </div>
  <RecentConsultations :consultations="mockRecentConsultations" />
</template>

<style scoped>
.cta-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}
@media (max-width: 1024px) {
  .cta-row {
    grid-template-columns: 1fr;
  }
}
</style>

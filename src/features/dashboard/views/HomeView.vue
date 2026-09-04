<script setup lang="ts">
import { computed } from 'vue'
import GreetingHeader from '../components/home/GreetingHeader.vue'
import StatsRow from '../components/home/StatsRow.vue'
import CtaPrimary from '../components/home/CtaPrimary.vue'
import CtaSecondary from '../components/home/CtaSecondary.vue'
import TodayAppointments from '../components/home/TodayAppointments.vue'
import { useTodayAgenda } from '../composables/useTodayAgenda'
import { useAuth } from '@/features/auth/composables/useAuth'

const { me } = useAuth()
const firstName = computed(() => me.value?.name.trim().split(/\s+/).filter(Boolean)[0] ?? '')

const { appointments, canRead, loading, error, ready } = useTodayAgenda()
const scheduledToday = computed(() => (ready.value ? appointments.value.length : null))
</script>

<template>
  <GreetingHeader :first-name="firstName" :scheduled-today="scheduledToday" />
  <StatsRow v-if="ready" :appointments="appointments" />
  <div class="cta-row">
    <CtaPrimary />
    <CtaSecondary />
  </div>
  <TodayAppointments
    v-if="canRead"
    :appointments="appointments"
    :loading="loading"
    :error="error"
  />
</template>

<style scoped>
.cta-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 28px;
}

@media (width <= 1024px) {
  .cta-row {
    grid-template-columns: 1fr;
  }
}
</style>

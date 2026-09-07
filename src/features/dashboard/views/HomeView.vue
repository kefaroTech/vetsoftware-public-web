<script setup lang="ts">
import { computed } from 'vue'
import GreetingHeader from '../components/home/GreetingHeader.vue'
import StatsRow from '../components/home/StatsRow.vue'
import CtaPrimary from '../components/home/CtaPrimary.vue'
import CtaSecondary from '../components/home/CtaSecondary.vue'
import TodayAppointments from '../components/home/TodayAppointments.vue'
import { useTodayAgenda } from '../composables/useTodayAgenda'
import { useAuth } from '@/features/auth/composables/useAuth'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'

const { me } = useAuth()
const firstName = computed(() => me.value?.name.trim().split(/\s+/).filter(Boolean)[0] ?? '')

const { appointments, canRead, loading, error, ready } = useTodayAgenda()
const scheduledToday = computed(() => (ready.value ? appointments.value.length : null))

const { can } = useAuthorization()
const canCreateConsultation = can(PERMISSIONS.CONSULTATION_CREATE)
const canClinicalHistory = can(PERMISSIONS.CLINICAL_HISTORY_READ)
const showCtaRow = computed(() => canCreateConsultation.value || canClinicalHistory.value)
</script>

<template>
  <GreetingHeader :first-name="firstName" :scheduled-today="scheduledToday" />
  <StatsRow v-if="ready" :appointments="appointments" />
  <div v-if="showCtaRow" class="cta-row">
    <CtaPrimary v-if="canCreateConsultation" />
    <CtaSecondary v-if="canClinicalHistory" />
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

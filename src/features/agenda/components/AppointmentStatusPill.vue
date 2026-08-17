<script setup lang="ts">
import { computed } from 'vue'
import { APPT_STATUS, type AppointmentStatus } from '../types/appointment'

const props = defineProps<{ status: AppointmentStatus }>()
const meta = computed(() => APPT_STATUS[props.status])
</script>

<template>
  <span class="pill ds-pill" :style="{ background: meta.bg, color: meta.fg }">
    <span class="ds-status-dot" :style="{ background: meta.dot }" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.pill {
  font-size: var(--text-caption);
}
</style>

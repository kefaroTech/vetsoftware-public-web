<script setup lang="ts">
import { computed } from 'vue'
import { APPT_STATUS, type AppointmentStatus } from '../types/appointment'

const props = defineProps<{ status: AppointmentStatus }>()
const meta = computed(() => APPT_STATUS[props.status])
</script>

<template>
  <span class="pill" :style="{ background: meta.bg, color: meta.fg }">
    <span class="dot" :style="{ background: meta.dot }" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

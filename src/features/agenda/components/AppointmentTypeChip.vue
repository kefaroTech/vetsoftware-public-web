<script setup lang="ts">
import { computed } from 'vue'
import { APPT_TYPES, apptTypeTokens, type AppointmentType } from '../types/appointment'

const props = defineProps<{ type: AppointmentType }>()
const meta = computed(() => APPT_TYPES[props.type])
const tokens = computed(() => apptTypeTokens(props.type))
</script>

<template>
  <span class="type-chip" :style="{ background: tokens.bg, color: tokens.fg }">
    <span aria-hidden="true">{{ meta.icon }}</span>{{ meta.label }}
  </span>
</template>

<style scoped>
.type-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
</style>

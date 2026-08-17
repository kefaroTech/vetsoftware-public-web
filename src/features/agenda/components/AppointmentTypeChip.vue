<script setup lang="ts">
import { computed } from 'vue'
import { APPT_TYPES, apptTypeTokens, type AppointmentType } from '../types/appointment'

const props = defineProps<{ type: AppointmentType }>()
const meta = computed(() => APPT_TYPES[props.type])
const tokens = computed(() => apptTypeTokens(props.type))
</script>

<template>
  <span class="type-chip ds-pill" :style="{ background: tokens.bg, color: tokens.fg }">
    <span aria-hidden="true">{{ meta.icon }}</span
    >{{ meta.label }}
  </span>
</template>

<style scoped>
/* Resto sobre `.ds-pill`: chip más compacto que la píldora base. */
.type-chip {
  gap: var(--space-4);
  padding: var(--space-2) var(--space-8);
  font-size: var(--text-caption);
}
</style>

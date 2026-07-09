<script setup lang="ts">
import { computed } from 'vue'
import { apptInitials, apptVetHue } from '../types/appointment'

const props = defineProps<{ employeeId: number; name: string }>()

const initials = computed(() => apptInitials(props.name))
const hue = computed(() => apptVetHue(props.employeeId))
</script>

<template>
  <span class="vet-badge">
    <span class="vet-dot" :style="{ background: `oklch(58% 0.16 ${hue})` }">{{ initials }}</span>
    {{ name }}
  </span>
</template>

<style scoped>
.vet-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--warm-600);
}
.vet-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: white;
  font-size: 8.5px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>

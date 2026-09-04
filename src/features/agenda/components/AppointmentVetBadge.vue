<script setup lang="ts">
import { computed } from 'vue'
import { apptInitials, apptVetTone } from '../types/appointment'

const props = defineProps<{ employeeId: number; name: string }>()

const initials = computed(() => apptInitials(props.name))
const tone = computed(() => apptVetTone(props.employeeId))
</script>

<template>
  <span class="vet-badge">
    <span class="vet-dot" :style="{ background: tone }">{{ initials }}</span>
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
  color: var(--warm-50);
  font-size: 8.5px;
  font-weight: 700;
  flex-shrink: 0;
}
</style>

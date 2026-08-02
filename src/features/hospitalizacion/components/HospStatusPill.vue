<script setup lang="ts">
import { STATUS_META, type HospStatus } from '../types/hospital'

defineProps<{ status: HospStatus }>()
</script>

<template>
  <span class="pill" :style="{ background: STATUS_META[status].bg, color: STATUS_META[status].fg }">
    <span class="dot" :style="{ background: STATUS_META[status].dot }" />
    {{ STATUS_META[status].label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>

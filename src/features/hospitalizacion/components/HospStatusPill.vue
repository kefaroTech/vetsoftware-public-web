<script setup lang="ts">
import { STATUS_META, type HospStatus } from '../types/hospital'

defineProps<{ status: HospStatus }>()
</script>

<template>
  <span
    class="pill ds-pill"
    :style="{ background: STATUS_META[status].bg, color: STATUS_META[status].fg }"
  >
    <span class="dot" :style="{ background: STATUS_META[status].dot }" />
    {{ STATUS_META[status].label }}
  </span>
</template>

<style scoped>
.pill {
  padding: var(--space-3) var(--space-10);
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
</style>

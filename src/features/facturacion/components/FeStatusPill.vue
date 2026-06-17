<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_META, type DianStatus } from '../types/facturacion'

const props = defineProps<{ status: DianStatus }>()

const meta = computed(() => STATUS_META[props.status] ?? STATUS_META.PENDIENTE)
</script>

<template>
  <span class="pill" :style="{ background: meta.tone.bg, color: meta.tone.fg }">
    <span class="dot" :style="{ background: meta.tone.dot }" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

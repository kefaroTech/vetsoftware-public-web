<script setup lang="ts">
import { computed } from 'vue'
import { colorsForCode } from '../constants/employee-roles'

const props = withDefaults(
  defineProps<{
    name: string
    code: string
    size?: 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const tokens = computed(() => colorsForCode(props.code))
</script>

<template>
  <span
    class="pill ds-pill"
    :class="`size-${size}`"
    :style="{ background: tokens.bg, color: tokens.fg }"
  >
    <span class="ds-status-dot" :style="{ background: tokens.dot }" />
    {{ name }}
  </span>
</template>

<style scoped>
.pill.size-md {
  padding: 3px 10px;
  font-size: 12px;
}

/* El punto es `.ds-status-dot` (primitives.css); el tono va inline. */
.pill.size-lg {
  padding: 5px 12px;
  font-size: 13px;
}
</style>

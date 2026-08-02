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
  <span class="pill" :class="`size-${size}`" :style="{ background: tokens.bg, color: tokens.fg }">
    <span class="dot" :style="{ background: tokens.dot }" />
    {{ name }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  font-weight: 500;
  white-space: nowrap;
  font-family: var(--font-sans);
}

.pill.size-md {
  padding: 3px 10px;
  font-size: 12px;
}

.pill.size-lg {
  padding: 5px 12px;
  font-size: 13px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
</style>

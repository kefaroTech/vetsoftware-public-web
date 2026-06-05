<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    size?: 'md' | 'lg'
  }>(),
  { size: 'md' },
)

const tokens = computed(() =>
  props.active
    ? { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' }
    : { bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' },
)

const label = computed(() => (props.active ? 'Activo' : 'Inactivo'))
</script>

<template>
  <span
    class="pill"
    :class="`size-${size}`"
    :style="{ background: tokens.bg, color: tokens.fg }"
  >
    <span class="dot" :style="{ background: tokens.dot }" />
    {{ label }}
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

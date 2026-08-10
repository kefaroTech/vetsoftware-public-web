<script setup lang="ts">
import { computed } from 'vue'
import type { RoleColor } from '../types'
import { ROLE_COLORS } from '../constants/roleColors'

const props = withDefaults(
  defineProps<{
    label: string
    color?: RoleColor
    size?: 'md' | 'lg'
  }>(),
  { color: 'amatista', size: 'md' },
)

const tokens = computed(() => ROLE_COLORS[props.color])
</script>

<template>
  <span class="pill" :class="size" :style="{ background: tokens.bg, color: tokens.fg }">
    <span class="dot" :style="{ background: tokens.dot }" />
    <span class="label">{{ label }}</span>
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-pill);
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}

.pill.md {
  padding: 3px 10px;
  font-size: 12px;
}

.pill.lg {
  padding: 5px 12px;
  font-size: 13px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.pill.md .dot {
  width: 5px;
  height: 5px;
}

.label {
  white-space: nowrap;
}
</style>

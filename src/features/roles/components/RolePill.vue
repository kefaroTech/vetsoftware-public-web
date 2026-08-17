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
  <span class="pill ds-pill" :class="size" :style="{ background: tokens.bg, color: tokens.fg }">
    <span class="dot ds-status-dot" :style="{ background: tokens.dot }" />
    <span class="label">{{ label }}</span>
  </span>
</template>

<style scoped>
.pill {
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

/* Forma del punto: `.ds-status-dot` (primitives.css). El tamaño `md` es un
   override local que pesa (0,3,0) y por tanto le gana. */
.pill.md .dot {
  width: 5px;
  height: 5px;
}

.label {
  white-space: nowrap;
}
</style>

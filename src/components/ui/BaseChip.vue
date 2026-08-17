<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'accent' | 'success' | 'warn'
  }>(),
  { variant: 'neutral' },
)
</script>

<template>
  <!-- El tono de acento es `.ds-tone--accent` (primitives.css); los otros tres
       no tienen primitiva equivalente y siguen siendo locales. -->
  <span class="chip" :class="variant === 'accent' ? 'ds-tone--accent' : `v-${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
}

.v-neutral {
  background: var(--warm-150);
  color: var(--warm-600);
}

.v-success {
  background: oklch(94% 0.04 145deg);
  color: oklch(40% 0.1 145deg);
}

.v-warn {
  background: oklch(94% 0.05 80deg);
  color: oklch(40% 0.12 80deg);
}
</style>

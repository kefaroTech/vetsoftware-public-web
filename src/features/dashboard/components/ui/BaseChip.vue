<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'accent' | 'success' | 'warn'
  }>(),
  { variant: 'neutral' },
)
</script>

<template>
  <span class="chip" :class="`v-${variant}`">
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
  border-radius: 999px;
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
}
.v-neutral {
  background: var(--warm-150);
  color: var(--warm-600);
}
.v-accent {
  background: var(--amatista-100);
  color: var(--amatista-700);
}
.v-success {
  background: oklch(94% 0.04 145);
  color: oklch(40% 0.10 145);
}
.v-warn {
  background: oklch(94% 0.05 80);
  color: oklch(40% 0.12 80);
}
</style>

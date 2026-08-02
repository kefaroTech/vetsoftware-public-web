<script setup lang="ts">
defineProps<{
  label: string
  tone?: 'success' | 'warn' | 'neutral' | 'danger' | 'info'
}>()
</script>

<template>
  <span class="pill" :class="`tone-${tone ?? 'neutral'}`">{{ label }}</span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  font-family: var(--font-sans);
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.tone-success {
  background: oklch(94% 0.06 145deg);
  color: oklch(38% 0.13 145deg);
}

.tone-warn {
  background: oklch(95% 0.07 80deg);
  color: oklch(40% 0.13 80deg);
}

.tone-neutral {
  background: var(--warm-150);
  color: var(--warm-700);
}

.tone-danger {
  background: oklch(94% 0.07 25deg);
  color: oklch(42% 0.18 25deg);
}

.tone-info {
  background: var(--amatista-100);
  color: var(--amatista-700);
}
</style>

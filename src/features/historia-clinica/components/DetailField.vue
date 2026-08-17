<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value?: string | number | null
    span?: 1 | 2 | 'full'
  }>(),
  { span: 1 },
)
</script>

<template>
  <div class="field ds-stack" :class="`span-${span}`">
    <div class="ds-label">{{ label }}</div>
    <div class="field__value">
      <slot>{{ value === null || value === undefined || value === '' ? '—' : value }}</slot>
    </div>
  </div>
</template>

<style scoped>
.field {
  gap: var(--space-4);
  min-width: 0;
}

.field.span-2 {
  grid-column: span 2;
}

.field.span-full {
  grid-column: 1 / -1;
}

.field__value {
  font-size: 14px;
  color: var(--warm-900);
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>

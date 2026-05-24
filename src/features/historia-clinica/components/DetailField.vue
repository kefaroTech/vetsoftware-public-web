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
  <div class="field" :class="`span-${span}`">
    <div class="field__label">{{ label }}</div>
    <div class="field__value">
      <slot>{{ value === null || value === undefined || value === '' ? '—' : value }}</slot>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.field.span-2 {
  grid-column: span 2;
}
.field.span-full {
  grid-column: 1 / -1;
}
.field__label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
.field__value {
  font-size: 14px;
  color: var(--warm-900);
  line-height: 1.45;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  label: string
  icon: Component
  active?: boolean
  disabled?: boolean
  expandable?: boolean
  expanded?: boolean
  badge?: string
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="nav-item"
    :class="{ active, disabled }"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
  >
    <component :is="icon" :size="17" :stroke-width="1.5" />
    <span class="label">{{ label }}</span>

    <span v-if="badge" class="badge">{{ badge }}</span>

    <svg
      v-else-if="expandable"
      class="chevron"
      :class="{ collapsed: !expanded }"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
</template>

<style scoped>
.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 400;
  color: oklch(88% 0.03 var(--hue) / 0.85);
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}
.nav-item:hover:not(.active):not(.disabled) {
  background: oklch(70% 0.04 var(--hue) / 0.08);
}
.nav-item.active {
  background: oklch(45% 0.16 var(--hue) / 0.4);
  color: oklch(98% 0.01 var(--hue));
  box-shadow: inset 0 0 0 1px oklch(70% 0.14 var(--hue) / 0.3);
  font-weight: 500;
}
.nav-item.disabled {
  color: oklch(70% 0.03 var(--hue) / 0.4);
  cursor: not-allowed;
}
.label {
  flex: 1;
}
.badge {
  font-size: 9.5px;
  padding: 2px 6px;
  background: oklch(70% 0.04 var(--hue) / 0.18);
  color: oklch(78% 0.04 var(--hue) / 0.7);
  border-radius: 4px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
.chevron {
  transition: transform 0.2s ease;
}
.chevron.collapsed {
  transform: rotate(-90deg);
}
</style>

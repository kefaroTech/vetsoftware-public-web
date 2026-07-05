<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  icon: Component
  to: RouteLocationRaw
  active?: boolean
}>()
</script>

<template>
  <RouterLink
    :to="to"
    class="sub-item"
    :class="{ active }"
    :title="label"
  >
    <component :is="icon" :size="14" :stroke-width="1.5" />
    <span>{{ label }}</span>
  </RouterLink>
</template>

<style scoped>
.sub-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  color: oklch(82% 0.04 var(--hue) / 0.72);
  text-decoration: none;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.12s ease;
}
.sub-item:hover:not(.active) {
  background: oklch(70% 0.04 var(--hue) / 0.08);
}
.sub-item.active {
  background: oklch(50% 0.10 var(--hue) / 0.25);
  color: oklch(95% 0.02 var(--hue));
  font-weight: 500;
}

@media (max-width: 1024px) {
  .sub-item {
    width: 44px;
    height: 34px;
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  .sub-item span {
    display: none;
  }
}
</style>

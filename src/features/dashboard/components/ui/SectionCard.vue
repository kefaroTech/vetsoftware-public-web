<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title?: string
  subtitle?: string
  icon?: Component
  accent?: boolean
  padded?: boolean
}>()
</script>

<template>
  <section class="section-card">
    <header v-if="title || subtitle || icon || $slots.action" class="head">
      <div v-if="icon" class="icon" :class="{ accent }">
        <component :is="icon" :size="16" :stroke-width="1.6" />
      </div>
      <div class="meta">
        <h2 v-if="title" class="title">{{ title }}</h2>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.action" class="action">
        <slot name="action" />
      </div>
    </header>
    <div :class="['body', { padded: padded !== false }]">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.section-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  overflow: hidden;
}
.head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--warm-200);
  display: flex;
  align-items: center;
  gap: 12px;
}
.icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--warm-150);
  color: var(--warm-600);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.icon.accent {
  background: var(--amatista-100);
  color: var(--amatista-700);
}
.meta {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
  letter-spacing: -0.005em;
}
.subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--warm-600);
}
.action {
  flex-shrink: 0;
}
.body.padded {
  padding: 20px;
}
</style>

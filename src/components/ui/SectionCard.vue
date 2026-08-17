<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    icon?: Component
    accent?: boolean
    padded?: boolean
  }>(),
  {
    accent: false,
    padded: true,
  },
)
</script>

<template>
  <section class="section-card">
    <header v-if="title || subtitle || icon || $slots.action" class="head">
      <!-- El tono va en una clase aparte de la forma: `.ds-tone--accent`
           (primitives.css) o el neutro local, nunca los dos. -->
      <div v-if="icon" class="icon" :class="accent ? 'ds-tone--accent' : 'icon-neutral'">
        <component :is="icon" :size="16" :stroke-width="1.6" />
      </div>
      <div class="ds-flex-fill">
        <h2 v-if="title" class="title">{{ title }}</h2>
        <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.action" class="action">
        <slot name="action" />
      </div>
    </header>
    <div :class="['body', { padded }]">
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
  container-type: inline-size;
}

.head {
  padding: 20px clamp(22px, 2vw + 12px, 36px);
  border-bottom: 1px solid var(--warm-200);
  display: flex;
  align-items: center;
  gap: 14px;
}

.icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.icon-neutral {
  background: var(--warm-150);
  color: var(--warm-600);
}

.title {
  margin: 0;
  font-size: 14.5px;
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
  padding: clamp(22px, 2vw + 12px, 36px);
}
</style>

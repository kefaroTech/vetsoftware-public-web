<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; sub?: string }>()
</script>

<template>
  <div class="sechead">
    <div class="sechead-ic ds-tone--accent">
      <component :is="icon" :size="18" :stroke-width="1.8" />
    </div>
    <div>
      <div class="sechead-title">{{ title }}</div>
      <div v-if="sub" class="sechead-sub ds-meta-dark ds-meta-dark--sm">{{ sub }}</div>
    </div>
  </div>
</template>

<style scoped>
.sechead {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sechead-ic {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.sechead-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.2;
}

.sechead-sub {
  margin-top: 3px;
  line-height: 1.45;
  max-width: 60ch;
}
</style>

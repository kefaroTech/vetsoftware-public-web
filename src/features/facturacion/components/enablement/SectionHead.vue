<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{ icon: Component; title: string; sub?: string }>()
</script>

<template>
  <div class="sechead">
    <div class="sechead-ic">
      <component :is="icon" :size="18" :stroke-width="1.8" />
    </div>
    <div>
      <div class="sechead-title">{{ title }}</div>
      <div v-if="sub" class="sechead-sub">{{ sub }}</div>
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
  background: var(--amatista-100);
  color: var(--amatista-700);
  flex-shrink: 0;
}

.sechead-title {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.2;
}

.sechead-sub {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--warm-600);
  line-height: 1.45;
  max-width: 60ch;
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'
/** Encabezado de sección con chip de ícono amatista (handoff reg-fields `SectionHead`). */
defineProps<{
  icon: Component
  title: string
  desc?: string
}>()
</script>

<template>
  <div class="pub-sechead">
    <div class="pub-sechead-chip">
      <component :is="icon" :size="17" aria-hidden="true" />
    </div>
    <div>
      <div class="pub-sechead-title">{{ title }}</div>
      <div v-if="desc" class="pub-sechead-desc">{{ desc }}</div>
    </div>
  </div>
</template>

<style scoped>
.pub-sechead {
  display: flex;
  align-items: center;
  gap: 11px;
}

.pub-sechead-chip {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, var(--pub-tint-50), var(--pub-tint-100));
  border: 1px solid var(--pub-tint-bd);
  display: grid;
  place-items: center;
  color: var(--pub-ame-700);
  flex-shrink: 0;
}

.pub-sechead-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--pub-ink-900);
  letter-spacing: -0.01em;
}

.pub-sechead-desc {
  font-size: 12px;
  color: var(--pub-ink-500);
  margin-top: 1px;
}
</style>

<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string
  tone: 'amatista' | 'neutral'
}>()
</script>

<template>
  <div class="stat-card">
    <div class="label ds-hint">{{ label }}</div>
    <div class="value">{{ value }}</div>
    <div v-if="sub" class="sub" :class="`sub-${tone}`">{{ sub }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px 16px;
}

/* Único añadido sobre `.ds-hint`: el hueco hacia la cifra. */
.label {
  margin-bottom: 6px;
}

.value {
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--warm-900);
}

.sub {
  font-size: 11.5px;
  margin-top: 4px;
}

.sub-amatista {
  color: var(--amatista-700);
}

.sub-neutral {
  color: var(--warm-500);
}
</style>

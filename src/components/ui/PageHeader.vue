<script setup lang="ts">
defineProps<{ kicker: string; title: string; lead?: string }>()
</script>

<template>
  <header class="page-head">
    <div class="kicker">{{ kicker }}</div>
    <div class="title-row">
      <div>
        <h1 class="ds-display">{{ title }}</h1>
        <p v-if="lead" class="lead">{{ lead }}</p>
      </div>
      <div class="action">
        <slot name="action" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.page-head {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.kicker {
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--warm-500);
  font-weight: 500;
}
.title-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.lead {
  margin: 6px 0 0;
  font-size: 13.5px;
  color: var(--warm-600);
  max-width: 540px;
  line-height: 1.5;
}
</style>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="heading">
    <h1 class="title">{{ title }}</h1>
    <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
  </div>
</template>

<style scoped>
.heading {
  margin-bottom: 24px;
}

.title {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.015em;
  color: var(--warm-900);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.5;
}
</style>

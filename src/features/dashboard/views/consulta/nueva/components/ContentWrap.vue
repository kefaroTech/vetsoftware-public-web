<script setup lang="ts">
withDefaults(defineProps<{ maxWidth?: number }>(), { maxWidth: 1280 })
</script>

<template>
  <div class="wrap">
    <div class="inner" :style="{ maxWidth: `${maxWidth}px` }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.wrap {
  flex: 1;
  padding: clamp(16px, 1.5vw + 8px, 32px) clamp(16px, 2vw + 12px, 48px);
}
.inner {
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>

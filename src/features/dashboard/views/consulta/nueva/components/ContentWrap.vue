<script setup lang="ts">
withDefaults(defineProps<{ maxWidth?: number }>(), { maxWidth: 1600 })
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
  padding: 28px clamp(20px, 3vw + 8px, 56px);
}
.inner {
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>

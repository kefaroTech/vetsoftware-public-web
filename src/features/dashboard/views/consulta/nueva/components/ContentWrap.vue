<script setup lang="ts">
withDefaults(defineProps<{ maxWidth?: number }>(), { maxWidth: 1080 })
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
  padding: 32px clamp(16px, 4vw, 56px);
}
.inner {
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}
@media (max-width: 720px) {
  .wrap {
    padding: 20px 16px;
  }
}
</style>

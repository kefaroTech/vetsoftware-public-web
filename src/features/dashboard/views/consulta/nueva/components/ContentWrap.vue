<script setup lang="ts">
withDefaults(defineProps<{ maxWidth?: number }>(), { maxWidth: 880 })
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
  padding: 32px 48px;
}
.inner {
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>

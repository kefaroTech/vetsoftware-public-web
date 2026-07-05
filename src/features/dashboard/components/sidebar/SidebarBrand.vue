<script setup lang="ts">
defineProps<{
  appName: string
  clinic: string
}>()
</script>

<template>
  <div class="brand">
    <div class="mark">V</div>
    <div class="text">
      <div class="name">{{ appName }}</div>
      <div class="clinic">{{ clinic }}</div>
    </div>
  </div>
</template>

<style scoped>
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px 22px;
}
.mark {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: oklch(72% 0.16 var(--hue));
  color: oklch(20% 0.05 var(--hue));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-style: italic;
  font-weight: 700;
  font-size: 15px;
}
.text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}
.name {
  font-size: 14px;
  font-weight: 500;
  color: oklch(96% 0.02 var(--hue));
}
.clinic {
  font-size: 11.5px;
  color: oklch(80% 0.04 var(--hue) / 0.7);
  margin-top: 2px;
}

@media (max-width: 1024px) {
  .brand {
    justify-content: center;
    padding: 8px 0 18px;
  }

  .text {
    display: none;
  }
}
</style>

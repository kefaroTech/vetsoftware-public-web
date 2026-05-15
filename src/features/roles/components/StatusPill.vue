<script setup lang="ts">
defineProps<{ active: boolean }>()
</script>

<template>
  <span class="pill" :class="{ on: active, off: !active }">
    <span class="dot" />
    <span>{{ active ? 'Activo' : 'Inactivo' }}</span>
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1;
}
.pill.on {
  background: var(--success-bg);
  color: var(--success-fg);
}
.pill.off {
  background: var(--warm-200);
  color: var(--warm-600);
}
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill.on .dot {
  background: var(--success-dot);
}
.pill.off .dot {
  background: var(--warm-500);
}
</style>

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
  gap: 6px;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
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
  width: 6px;
  height: 6px;
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

<script setup lang="ts">
import { Search } from 'lucide-vue-next'
</script>

<template>
  <div class="search-box">
    <Search :size="15" :stroke-width="1.5" class="icon" />
    <span class="placeholder">Buscar paciente, dueño, código…</span>
    <kbd class="kbd">⌘K</kbd>
  </div>
</template>

<style scoped>
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  background: var(--warm-150);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  width: 320px;
  color: var(--warm-500);
  font-size: 13px;
  cursor: pointer;
}
.icon {
  flex-shrink: 0;
}
.placeholder {
  flex: 1;
}
.kbd {
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 2px 6px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 4px;
  color: var(--warm-600);
}
</style>

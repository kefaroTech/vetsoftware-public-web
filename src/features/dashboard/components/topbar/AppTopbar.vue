<script setup lang="ts">
import { Bell, Settings } from 'lucide-vue-next'
import SearchBox from './SearchBox.vue'
import UserMenu from './UserMenu.vue'
import { mockUser } from '../../data/mock'
</script>

<template>
  <header class="topbar">
    <SearchBox />
    <div class="actions">
      <button type="button" class="icon-btn" aria-label="Notificaciones">
        <Bell :size="16" :stroke-width="1.5" />
      </button>
      <button type="button" class="icon-btn" aria-label="Ajustes">
        <Settings :size="16" :stroke-width="1.5" />
      </button>
      <div class="divider" />
      <UserMenu :first-name="mockUser.firstName" :last-name="mockUser.lastName" />
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 60px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--warm-50);
  border-bottom: 1px solid var(--warm-200);
  flex-shrink: 0;
}
.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-600);
  cursor: pointer;
  transition: background 0.12s ease;
}
.icon-btn:hover {
  background: var(--warm-100);
}
.divider {
  width: 1px;
  height: 22px;
  background: var(--warm-200);
  margin: 0 4px;
}
</style>

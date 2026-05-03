<script setup lang="ts">
import AppSidebar from '../components/sidebar/AppSidebar.vue'
import AppTopbar from '../components/topbar/AppTopbar.vue'
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="app-main">
      <AppTopbar />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  width: 100%;
  height: 100vh;
  display: flex;
  background: var(--warm-100);
  color: var(--warm-900);
  font-family: var(--font-sans);
  overflow: hidden;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.app-content {
  flex: 1;
  padding: 36px 48px;
  overflow: auto;
}
</style>

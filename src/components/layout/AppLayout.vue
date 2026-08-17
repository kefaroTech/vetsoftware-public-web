<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'

const route = useRoute()
const fullBleed = computed(() => Boolean(route.meta.fullBleed))
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="ds-stack ds-flex-fill">
      <main class="app-content" :class="{ fullbleed: fullBleed }">
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

.app-content {
  flex: 1;
  padding: 24px 28px;
  overflow: auto;
}

.app-content.fullbleed {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

@media (width <= 1024px) {
  .app-content {
    padding: 18px;
  }

  .app-content.fullbleed {
    padding: 0;
  }
}
</style>

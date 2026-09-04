<script setup lang="ts">
import { ref } from 'vue'
import { Bell } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const notificationCount = ref(0)

function onNotifications() {
  toast.info('Notificaciones', 'No tienes notificaciones nuevas.')
}
</script>

<template>
  <button type="button" class="notif-item" @click="onNotifications">
    <Bell :size="17" :stroke-width="1.6" />
    <span class="notif-label">Notificaciones</span>
    <!-- §4.1.2: en el raíl el rótulo visible se oculta y el botón se queda sin nombre
         accesible. El de repuesto solo entra en el árbol ahí, para que fuera del raíl el
         nombre no se anuncie dos veces. -->
    <span class="notif-rail-label ds-sr-only">Notificaciones</span>
    <span v-if="notificationCount > 0" class="notif-badge">{{ notificationCount }}</span>
  </button>
</template>

<style scoped>
.notif-item {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
  margin-bottom: 4px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: oklch(88% 0.03 var(--hue) / 82%);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.notif-item:hover {
  background: oklch(70% 0.04 var(--hue) / 10%);
}

.notif-label {
  flex: 1;
}

.notif-rail-label {
  display: none;
}

.notif-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: var(--radius-pill);
  background: oklch(58% 0.2 25deg);
  color: white;
  font-size: 11px;
  font-weight: 600;
  display: grid;
  place-items: center;
}

@media (width <= 1024px) {
  .notif-item {
    width: 44px;
    height: 38px;
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  .notif-label,
  .notif-badge {
    display: none;
  }

  .notif-rail-label {
    display: block;
  }
}
</style>

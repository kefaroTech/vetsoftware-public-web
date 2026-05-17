<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuth } from '@/features/auth/composables/useAuth'

const props = defineProps<{
  firstName: string
  lastName: string
}>()

const { logout } = useAuth()

const open = ref(false)

const initials = computed(() =>
  `${props.firstName.charAt(0)}${props.lastName.charAt(0)}`.toUpperCase(),
)

function handleLogout() {
  open.value = false
  logout()
}
</script>

<template>
  <div class="user-menu">
    <button
      type="button"
      class="avatar"
      aria-label="Menú de usuario"
      @click="open = !open"
    >
      {{ initials }}
    </button>

    <div v-if="open" class="dropdown" role="menu">
      <button type="button" class="item" disabled>Mi perfil</button>
      <button type="button" class="item" disabled>Configuración</button>
      <div class="divider" />
      <button type="button" class="item danger" @click="handleLogout">
        Cerrar sesión
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}
.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350));
  color: white;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  box-shadow:
    0 0 0 2px var(--warm-50),
    0 0 0 3px var(--warm-200);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  min-width: 180px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.15);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  z-index: 100;
}
.item {
  text-align: left;
  padding: 8px 10px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-800);
  border-radius: 6px;
  cursor: pointer;
}
.item:hover:not(:disabled) {
  background: var(--warm-150);
}
.item:disabled {
  color: var(--warm-400);
  cursor: not-allowed;
}
.item.danger {
  color: oklch(50% 0.18 25);
}
.divider {
  height: 1px;
  background: var(--warm-200);
  margin: 4px 0;
}
</style>

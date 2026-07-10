<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronRight, LogOut } from 'lucide-vue-next'
import { useAuth } from '@/features/auth/composables/useAuth'

const props = defineProps<{
  firstName: string
  lastName: string
  role: string
}>()

const { logout } = useAuth()

const initials = computed(() =>
  `${props.firstName.charAt(0)}${props.lastName.charAt(0)}`.toUpperCase(),
)
const fullName = computed(() => `${props.firstName} ${props.lastName}`)

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const loggingOut = ref(false)

function toggle() {
  open.value = !open.value
}

async function onLogout() {
  if (loggingOut.value) return
  loggingOut.value = true
  open.value = false
  // El store revoca la sesión server-side (best-effort), limpia el estado y redirige a /login.
  await logout()
}

function onClickOutside(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    open.value = false
  }
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div ref="root" class="user-wrap">
    <transition name="menu-fade">
      <div v-if="open" class="user-menu" role="menu">
        <button type="button" class="menu-item logout" role="menuitem" @click="onLogout">
          <LogOut :size="15" :stroke-width="1.7" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </transition>

    <button
      type="button"
      class="user-card"
      :class="{ open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <div class="avatar">{{ initials }}</div>
      <div class="info">
        <div class="name">{{ fullName }}</div>
        <div class="role">{{ role }}</div>
      </div>
      <ChevronRight :size="14" :stroke-width="1.5" class="chev" />
    </button>
  </div>
</template>

<style scoped>
.user-wrap {
  position: relative;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: none;
  border-radius: 10px;
  background: oklch(35% 0.1 var(--hue) / 0.4);
  color: oklch(94% 0.02 var(--hue));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease;
}
.user-card:hover,
.user-card.open {
  background: oklch(40% 0.1 var(--hue) / 0.5);
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 12.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.role {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 1px;
}
.chev {
  opacity: 0.5;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}
.user-card.open .chev {
  transform: rotate(90deg);
}

/* Menú desplegable (aparece encima de la tarjeta) */
.user-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  padding: 6px;
  border-radius: 10px;
  background: oklch(30% 0.08 var(--hue));
  border: 1px solid oklch(70% 0.04 var(--hue) / 0.14);
  box-shadow: 0 12px 28px -10px oklch(15% 0.08 var(--hue) / 0.7);
  z-index: 30;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 11px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: oklch(90% 0.03 var(--hue) / 0.9);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}
.menu-item.logout:hover {
  background: oklch(58% 0.2 25 / 0.16);
  color: oklch(85% 0.14 25);
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition:
    opacity 0.14s ease,
    transform 0.14s ease;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (max-width: 1024px) {
  .user-card {
    justify-content: center;
    padding: 8px 0;
  }
  .info,
  .chev {
    display: none;
  }
  /* En modo colapsado el menú necesita ancho propio para el texto. */
  .user-menu {
    left: 0;
    right: auto;
    min-width: 168px;
  }
}
</style>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ChevronRight, LogOut } from 'lucide-vue-next'
import { useAuth } from '@/features/auth/composables/useAuth'

const props = defineProps<{
  firstName: string
  lastName: string
  /**
   * Opcional: `/auth/me` entrega la lista de permisos, no el nombre del rol. Sin
   * dato real la línea no se pinta, en vez de mostrar uno inventado (EST-12).
   */
  role?: string
}>()

const { logout } = useAuth()

const initials = computed(() =>
  `${props.firstName.charAt(0)}${props.lastName.charAt(0)}`.toUpperCase(),
)
/**
 * El nombre visible es también el nombre accesible del botón que abre el menú de
 * cuenta. Mientras `/auth/me` no ha respondido llega vacío, y un botón sin texto
 * es un botón sin nombre para el lector de pantalla: de ahí el rótulo genérico
 * del control, que no finge ser el nombre de nadie.
 */
const fullName = computed(() => `${props.firstName} ${props.lastName}`.trim() || 'Mi cuenta')

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const loggingOut = ref(false)

const menuItems = () =>
  Array.from(menu.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

function openMenu() {
  open.value = true
  nextTick(() => menuItems()[0]?.focus())
}

function closeMenu(refocus = false) {
  if (!open.value) return
  open.value = false
  if (refocus) trigger.value?.focus()
}

function toggle() {
  open.value ? closeMenu(true) : openMenu()
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
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    closeMenu(true)
    return
  }
  const items = menuItems()
  if (items.length === 0) return
  const actual = items.indexOf(document.activeElement as HTMLElement)
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      items[(actual + 1) % items.length]?.focus()
      break
    case 'ArrowUp':
      e.preventDefault()
      items[(actual - 1 + items.length) % items.length]?.focus()
      break
    case 'Home':
      e.preventDefault()
      items[0]?.focus()
      break
    case 'End':
      e.preventDefault()
      items[items.length - 1]?.focus()
      break
  }
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
    <button
      id="user-card-trigger"
      ref="trigger"
      type="button"
      class="user-card"
      :class="{ open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <div class="avatar">{{ initials }}</div>
      <div class="info ds-stack ds-flex-fill">
        <div class="name ds-truncate">{{ fullName }}</div>
        <div v-if="role" class="role">{{ role }}</div>
      </div>
      <!-- §4.1.2: en el raíl `.info` se oculta y el botón queda nombrado solo por las
           iniciales del avatar, que no identifican a nadie. Este rótulo de repuesto solo entra
           en el árbol ahí, para que fuera del raíl el nombre no se anuncie dos veces. -->
      <span class="rail-name ds-sr-only">{{ fullName }}</span>
      <ChevronRight :size="14" :stroke-width="1.5" class="chev" />
    </button>

    <!-- §2.4.3: el menú va DESPUÉS del disparador en el DOM aunque se pinte encima.
         Al revés, «Cerrar sesión» solo se alcanzaba con Shift+Tab, en la dirección
         contraria a la que abre el menú. La posición la fija `.user-menu`, que es
         absoluta: el orden del documento no mueve un píxel. -->
    <transition name="menu-fade">
      <div v-if="open" ref="menu" class="user-menu" role="menu" aria-labelledby="user-card-trigger">
        <button type="button" class="menu-item logout" role="menuitem" @click="onLogout">
          <LogOut :size="15" :stroke-width="1.7" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </transition>
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
  background: oklch(35% 0.1 var(--hue) / 40%);
  color: oklch(94% 0.02 var(--hue));
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  width: 100%;
  transition: background 0.12s ease;
}

.user-card:hover,
.user-card.open {
  background: oklch(40% 0.1 var(--hue) / 50%);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30deg), oklch(65% 0.16 350deg));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.name {
  font-size: 12.5px;
  font-weight: 500;
}

.role {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 1px;
}

.rail-name {
  display: none;
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
  border: 1px solid oklch(70% 0.04 var(--hue) / 14%);
  box-shadow: 0 12px 28px -10px oklch(15% 0.08 var(--hue) / 70%);
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
  color: oklch(90% 0.03 var(--hue) / 90%);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s ease;
}

.menu-item.logout:hover {
  background: oklch(58% 0.2 25deg / 16%);
  color: oklch(85% 0.14 25deg);
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

@media (width <= 1024px) {
  .user-card {
    justify-content: center;
    padding: 8px 0;
  }

  .info,
  .chev {
    display: none;
  }

  .rail-name {
    display: block;
  }

  /* En modo colapsado el menú necesita ancho propio para el texto. */
  .user-menu {
    left: 0;
    right: auto;
    min-width: 168px;
  }
}
</style>

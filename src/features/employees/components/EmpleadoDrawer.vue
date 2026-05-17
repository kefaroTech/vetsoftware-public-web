<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { X, Key, Pencil, Power, Check } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import { colorsForCode } from '../constants/employee-roles'
import EmployeeAvatar from './EmployeeAvatar.vue'
import RolePill from './RolePill.vue'
import StatusPill from './StatusPill.vue'
import DrawerTabDatos from './DrawerTabDatos.vue'

const props = defineProps<{
  employee: Employee | null
  busy?: boolean
  canUpdate?: boolean
}>()

const emit = defineEmits<{
  close: []
  edit: [employee: Employee]
  deactivate: [employee: Employee]
  activate: [employee: Employee]
}>()

const open = computed(() => props.employee !== null)
const headerTokens = computed(() => {
  if (!props.employee) return null
  const firstCode = props.employee.roles[0]?.code ?? ''
  return colorsForCode(firstCode)
})
const headerStyle = computed(() => {
  if (!headerTokens.value) return {}
  return {
    background: `linear-gradient(180deg, ${headerTokens.value.bg} 0%, var(--warm-50) 100%)`,
  }
})

function onKey(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="open && employee"
        class="drawer-root"
        role="dialog"
        aria-modal="true"
        @click.self="emit('close')"
      >
        <aside class="drawer">
          <header class="head" :style="headerStyle">
            <button
              type="button"
              class="close"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :size="15" :stroke-width="1.8" />
            </button>

            <div class="head-row">
              <EmployeeAvatar
                :initials="employee.initials"
                :size="64"
                :active="employee.status === 'ACTIVE'"
                :role-code="employee.roles[0]?.code ?? ''"
              />
              <div class="head-info">
                <h2 class="name">{{ employee.name }}</h2>
                <div class="code">{{ employee.employeeCode }}</div>
                <div class="pills">
                  <template v-if="employee.roles.length > 0">
                    <RolePill
                      v-for="r in employee.roles"
                      :key="r.id"
                      :name="r.name"
                      :code="r.code"
                      size="lg"
                    />
                  </template>
                  <span v-else class="no-role">Sin rol asignado</span>
                  <StatusPill :active="employee.status === 'ACTIVE'" size="lg" />
                </div>
              </div>
            </div>
          </header>

          <div class="body">
            <DrawerTabDatos :employee="employee" />
          </div>

          <footer class="foot">
            <button
              type="button"
              class="ghost"
              disabled
              title="Próximamente — endpoint pendiente"
            >
              <Key :size="14" :stroke-width="1.7" />
              Restablecer contraseña
            </button>
            <button
              v-if="canUpdate"
              type="button"
              class="ghost"
              :disabled="busy"
              @click="emit('edit', employee)"
            >
              <Pencil :size="14" :stroke-width="1.7" />
              Editar
            </button>
            <div class="spacer" />
            <button
              v-if="canUpdate && employee.status === 'ACTIVE'"
              type="button"
              class="danger"
              :disabled="busy"
              @click="emit('deactivate', employee)"
            >
              <Power :size="14" :stroke-width="1.7" />
              Desactivar
            </button>
            <button
              v-else-if="canUpdate && employee.status !== 'ACTIVE'"
              type="button"
              class="primary"
              :disabled="busy"
              @click="emit('activate', employee)"
            >
              <Check :size="14" :stroke-width="2" />
              Reactivar
            </button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-root {
  position: fixed;
  inset: 0;
  background: oklch(20% 0.05 var(--hue) / 0.35);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: 1400;
  font-family: var(--font-sans);
}
.drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: var(--warm-50);
  border-left: 1px solid var(--warm-200);
  box-shadow: -20px 0 60px -20px oklch(20% 0.05 var(--hue) / 0.25);
  display: flex;
  flex-direction: column;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}

.head {
  position: relative;
  padding: 22px 26px 18px;
  border-bottom: 1px solid var(--warm-200);
}
.close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  display: grid;
  place-items: center;
  cursor: pointer;
  color: var(--warm-600);
  transition: background 0.12s ease;
}
.close:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}
.head-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.head-info {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}
.name {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 26px;
  line-height: 1.1;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  word-break: break-word;
}
.code {
  font-size: 13px;
  color: var(--warm-600);
  margin-top: 4px;
}
.pills {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
  align-items: center;
}
.no-role {
  font-size: 12.5px;
  color: var(--warm-500);
  font-style: italic;
}

.body {
  flex: 1;
  overflow: auto;
  padding: 22px 26px 28px;
}

.foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 26px;
  border-top: 1px solid var(--warm-200);
  background: var(--warm-100);
  flex-wrap: wrap;
}
.spacer {
  flex: 1;
}
.ghost,
.danger,
.primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid transparent;
}
.ghost {
  background: var(--warm-50);
  color: var(--warm-700);
  border-color: var(--warm-200);
}
.ghost:hover:not(:disabled) {
  background: var(--warm-100);
}
.ghost:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.danger {
  font-weight: 500;
  background: oklch(94% 0.05 25);
  color: oklch(48% 0.18 25);
  border-color: oklch(48% 0.18 25);
}
.danger:hover:not(:disabled) {
  background: oklch(91% 0.07 25);
}
.danger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.primary {
  font-weight: 500;
  background: var(--amatista-700);
  color: white;
  border: none;
}
.primary:hover:not(:disabled) {
  background: var(--amatista-800);
}
.primary:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { X, Key, Pencil, Power, Check, Lock, ShieldCheck, Mail, Building2 } from 'lucide-vue-next'
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
  'change-roles': [employee: Employee]
  'change-branches': [employee: Employee]
  'resend-invitation': [employee: Employee]
  deactivate: [employee: Employee]
  activate: [employee: Employee]
}>()

const isAdmin = computed(() => props.employee?.roles.some((r) => r.code === 'ADMIN') ?? false)

const isInvited = computed(() => props.employee?.status === 'INVITED')

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
      <div v-if="open && employee" class="drawer-root" role="dialog" aria-modal="true">
        <aside class="drawer ds-stack">
          <header class="head" :style="headerStyle">
            <button
              type="button"
              class="close ds-hover-neutral"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <X :size="15" :stroke-width="1.8" />
            </button>

            <div class="head-row">
              <EmployeeAvatar
                :initials="employee.initials"
                :size="64"
                :active="employee.enabled"
                :role-code="employee.roles[0]?.code ?? ''"
              />
              <div class="head-info ds-flex-fill">
                <h2 class="name">{{ employee.name }}</h2>
                <div class="code ds-meta-dark">{{ employee.employeeCode }}</div>
                <div class="pills ds-flex-row">
                  <template v-if="employee.roles.length > 0">
                    <RolePill
                      v-for="r in employee.roles"
                      :key="r.id"
                      :name="r.name"
                      :code="r.code"
                      size="lg"
                    />
                  </template>
                  <span v-else class="no-role ds-meta ds-meta--sm">Sin rol asignado</span>
                  <StatusPill
                    :active="employee.enabled"
                    :invited="employee.status === 'INVITED'"
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </header>

          <div class="body">
            <DrawerTabDatos :employee="employee" />
          </div>

          <footer class="foot">
            <button
              v-if="isInvited && canUpdate"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug accent ds-tone--accent-soft"
              :disabled="busy"
              title="Enviar de nuevo la invitación con una nueva contraseña provisional"
              @click="emit('resend-invitation', employee)"
            >
              <Mail :size="14" :stroke-width="1.7" />
              Reenviar invitación
            </button>
            <button
              v-else
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug"
              disabled
              title="Próximamente — endpoint pendiente"
            >
              <Key :size="14" :stroke-width="1.7" />
              Restablecer contraseña
            </button>
            <button
              v-if="canUpdate"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug"
              :disabled="busy"
              @click="emit('edit', employee)"
            >
              <Pencil :size="14" :stroke-width="1.7" />
              Editar
            </button>
            <button
              v-if="canUpdate"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug"
              :disabled="busy"
              @click="emit('change-roles', employee)"
            >
              <ShieldCheck :size="14" :stroke-width="1.7" />
              Cambiar roles
            </button>
            <button
              v-if="canUpdate"
              type="button"
              class="ds-btn ds-btn--ghost ds-btn--snug"
              :disabled="busy || isAdmin"
              :title="
                isAdmin
                  ? 'Un administrador tiene acceso a todas las sedes; no se le asignan sedes.'
                  : undefined
              "
              @click="emit('change-branches', employee)"
            >
              <Building2 :size="14" :stroke-width="1.7" />
              Cambiar sedes
            </button>
            <div class="ds-flex-fill" />
            <span
              v-if="canUpdate && employee.enabled && isAdmin"
              class="admin-lock"
              title="Los empleados con rol ADMIN no pueden ser desactivados"
            >
              <Lock :size="12" :stroke-width="1.8" />
              ADMIN protegido
            </span>
            <button
              v-else-if="canUpdate && employee.enabled"
              type="button"
              class="danger"
              :class="{ 'ds-is-disabled--60': busy }"
              :disabled="busy"
              @click="emit('deactivate', employee)"
            >
              <Power :size="14" :stroke-width="1.7" />
              Desactivar
            </button>
            <button
              v-else-if="canUpdate && !employee.enabled"
              type="button"
              class="ds-btn ds-btn--solid ds-btn--snug"
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
  background: oklch(20% 0.05 var(--hue) / 35%);
  backdrop-filter: blur(2px);
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
  box-shadow: -20px 0 60px -20px oklch(20% 0.05 var(--hue) / 25%);
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

/* El hover del cerrar es `.ds-hover-neutral` (primitives.css): pesa (0,3,0) y
   por tanto le gana al fondo/color en reposo de `.close`. */
.head-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.head-info {
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
  overflow-wrap: anywhere;
}

/* Color y tamaño vienen de `.ds-meta-dark`. */
.code {
  margin-top: 4px;
}

.pills {
  flex-wrap: wrap;
  margin-top: 12px;
}

/* Color y tamaño vienen de `.ds-meta` + `.ds-meta--sm`. */
.no-role {
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

/* El fantasma y el primario usan `.ds-btn` (primitives.css); este destructivo
   se queda local por su borde del mismo tono que el texto. */
.danger {
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

/* Fondo y color son `.ds-tone--accent-soft`; el peso ya lo pone `.ds-btn`. */
.accent {
  border-color: var(--amatista-200, oklch(88% 0.05 300deg));
}

.accent:hover:not(:disabled) {
  background: var(--amatista-100, oklch(94% 0.04 300deg));
}

.danger {
  font-weight: 500;
  background: oklch(94% 0.05 25deg);
  color: var(--danger-700);
  border-color: var(--danger-700);
}

.danger:hover:not(:disabled) {
  background: oklch(91% 0.07 25deg);
}

/* La opacidad la pone `.ds-is-disabled--60` desde el template; el cursor no
   puede, porque `.danger` ya declara `cursor:pointer` a (0,2,0). */
.danger:disabled {
  cursor: not-allowed;
}

.admin-lock {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  background: var(--warm-100);
  border: 1px solid var(--warm-300);
  color: var(--warm-700);
  border-radius: 7px;
}
</style>

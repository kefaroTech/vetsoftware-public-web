<script setup lang="ts">
import { computed } from 'vue'
import { Shield, Sparkles, ArrowRight, Lock } from 'lucide-vue-next'
import SwitchToggle from './SwitchToggle.vue'
import StatusPill from './StatusPill.vue'
import { ROLE_COLORS } from '../constants/roleColors'
import type { RoleColor, RoleResponse, SubModuleResponse } from '../types'

const props = defineProps<{
  role: RoleResponse
  active: boolean
  color: RoleColor
  permissionCount: number
  subModules: SubModuleResponse[]
  totalCatalogPermissions: number
  readOnly?: boolean
}>()

const emit = defineEmits<{
  'toggle-active': [value: boolean]
  edit: []
}>()

const tokens = computed(() => ROLE_COLORS[props.color])
const isAdmin = computed(
  () =>
    props.totalCatalogPermissions > 0 && props.permissionCount === props.totalCatalogPermissions,
)
const visibleChips = computed(() => props.subModules.slice(0, 4))
const overflowCount = computed(() => Math.max(0, props.subModules.length - 4))
</script>

<template>
  <article class="card ds-stack" :class="{ inactive: !active }">
    <div class="head">
      <div class="ds-flex-row ds-flex-row--12 ds-flex-fill">
        <div class="avatar" :style="{ background: tokens.avatarBg, color: tokens.avatarFg }">
          <Shield :size="18" :stroke-width="1.7" />
        </div>
        <div class="title-block ds-stack">
          <h3 class="name">{{ role.name }}</h3>
          <StatusPill :active="active" />
        </div>
      </div>
      <SwitchToggle
        :model-value="active"
        :aria-label="`Activar ${role.name}`"
        :disabled="readOnly"
        @update:model-value="(v) => emit('toggle-active', v)"
      />
    </div>

    <div v-if="readOnly" class="readonly-badge" :title="`Rol del sistema · solo lectura`">
      <Lock :size="12" :stroke-width="1.8" />
      <span>Rol del sistema · solo lectura</span>
    </div>

    <div v-if="isAdmin && !readOnly" class="admin-badge ds-tone--accent-soft">
      <Sparkles :size="12" :stroke-width="1.8" />
      <span>Acceso total al sistema</span>
    </div>

    <div class="stats">
      <div class="stat ds-stack">
        <div class="stat-num">{{ permissionCount }}</div>
        <div class="stat-label">permisos</div>
      </div>
      <div class="divider" />
      <div class="stat ds-stack">
        <div class="stat-num">{{ subModules.length }}</div>
        <div class="stat-label">sub-módulos</div>
      </div>
    </div>

    <div v-if="subModules.length > 0" class="chips">
      <span v-for="sm in visibleChips" :key="sm.id" class="chip">{{ sm.name }}</span>
      <span v-if="overflowCount > 0" class="chip more">+{{ overflowCount }}</span>
    </div>
    <div v-else class="chips-empty">Sin permisos asignados</div>

    <button type="button" class="edit-btn ds-tone--accent-soft" @click="emit('edit')">
      <span>{{ readOnly ? 'Ver permisos' : 'Editar permisos' }}</span>
      <ArrowRight :size="14" :stroke-width="1.8" />
    </button>
  </article>
</template>

<style scoped>
/* La insignia de admin y el botón de editar usan `.ds-tone--accent-soft`. */
.card {
  gap: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 18px;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.card:hover {
  border-color: var(--warm-300);
  box-shadow: 0 4px 14px -8px rgb(20 15 30 / 18%);
}

.card.inactive {
  opacity: 0.65;
  border-color: var(--warm-150);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.title-block {
  gap: 4px;
  min-width: 0;
}

.name {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--warm-900);
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 10px;
  border: 1px solid var(--amatista-200);
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 500;
}

.readonly-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 4px 10px;
  background: var(--warm-100);
  border: 1px solid var(--warm-300);
  color: var(--warm-700);
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 500;
}

.stats {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--warm-150);
  border-bottom: 1px solid var(--warm-150);
}

.stat {
  align-items: flex-start;
  gap: 1px;
}

.stat-num {
  font-family: var(--font-serif);
  font-size: 26px;
  line-height: 1;
  color: var(--warm-900);
  letter-spacing: -0.02em;
}

.stat-label {
  font-size: 11px;
  color: var(--warm-500);
  letter-spacing: 0.02em;
}

.divider {
  width: 1px;
  height: 30px;
  background: var(--warm-200);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--warm-150);
  color: var(--warm-700);
  white-space: nowrap;
}

.chip.more {
  background: var(--warm-200);
  font-weight: 500;
}

.chips-empty {
  font-size: 12px;
  color: var(--warm-500);
  font-style: italic;
}

.edit-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--amatista-200);
  border-radius: 7px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.edit-btn:hover {
  background: var(--amatista-100);
  border-color: var(--amatista-300);
}
</style>

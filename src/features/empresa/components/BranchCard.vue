<script setup lang="ts">
import { MapPin, Phone, Pencil, Power, PowerOff } from 'lucide-vue-next'
import type { BranchResponse } from '@/features/branches/api/branch.api'

defineProps<{
  branch: BranchResponse
  principal: boolean
  canManage: boolean
}>()

defineEmits<{
  edit: [branch: BranchResponse]
  'toggle-active': [branch: BranchResponse]
}>()
</script>

<template>
  <div class="branchcard" :class="{ inactive: !branch.active }">
    <div class="top">
      <span class="ic"><MapPin :size="17" :stroke-width="1.7" /></span>
      <div class="head">
        <div class="name">{{ branch.name }}</div>
        <div class="code">{{ branch.code }}</div>
      </div>
      <div class="badges">
        <span v-if="principal" class="badge principal">Principal</span>
        <span class="badge" :class="branch.active ? 'active' : 'off'">
          {{ branch.active ? 'Activa' : 'Inactiva' }}
        </span>
      </div>
    </div>

    <div class="meta">
      <div class="line">
        <MapPin :size="13" :stroke-width="1.6" />
        {{ branch.city?.name || '—' }}{{ branch.address ? ` · ${branch.address}` : '' }}
      </div>
      <div class="line">
        <Phone :size="13" :stroke-width="1.6" />
        {{ branch.phone || 'Sin teléfono' }}
      </div>
    </div>

    <div v-if="canManage" class="foot">
      <button
        type="button"
        class="act toggle"
        :class="{ danger: branch.active }"
        :title="branch.active ? 'Desactivar sede' : 'Activar sede'"
        @click="$emit('toggle-active', branch)"
      >
        <component :is="branch.active ? PowerOff : Power" :size="13" :stroke-width="1.7" />
        {{ branch.active ? 'Desactivar' : 'Activar' }}
      </button>
      <button type="button" class="act edit" @click="$emit('edit', branch)">
        <Pencil :size="13" :stroke-width="1.7" /> Editar
      </button>
    </div>
  </div>
</template>

<style scoped>
.branchcard {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  transition:
    border-color 0.14s ease,
    box-shadow 0.14s ease;
}

.branchcard:hover {
  border-color: var(--amatista-200);
  box-shadow: 0 6px 18px -12px oklch(45% 0.12 var(--hue) / 40%);
}

.branchcard.inactive {
  opacity: 0.72;
}

.top {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.ic {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.branchcard.inactive .ic {
  background: var(--warm-200);
  color: var(--warm-500);
}

.head {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--warm-900);
  line-height: 1.15;
}

.code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--warm-500);
  margin-top: 2px;
}

.badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.badge.principal {
  background: var(--amatista-100);
  color: var(--amatista-700);
}

.badge.active {
  background: var(--success-bg);
  color: var(--success-fg);
}

.badge.off {
  background: var(--warm-200);
  color: var(--warm-600);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 14px 0 12px;
}

.line {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--warm-600);
  min-width: 0;
}

.line :deep(svg) {
  color: var(--warm-400);
  flex-shrink: 0;
}

.foot {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--warm-150);
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--warm-200);
  background: transparent;
  color: var(--warm-700);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

.act.edit:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}

.act.toggle:hover {
  background: var(--warm-100);
  border-color: var(--warm-300);
}

.act.toggle.danger:hover {
  background: oklch(95% 0.04 25deg);
  border-color: oklch(75% 0.12 25deg);
  color: oklch(50% 0.18 25deg);
}
</style>

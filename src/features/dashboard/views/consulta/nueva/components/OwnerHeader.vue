<script setup lang="ts">
import type { Owner } from '@/types/domain'
import { initials } from '../composables/format'

defineProps<{
  owner: Owner
  petCount: number
}>()

defineEmits<{ edit: [] }>()
</script>

<template>
  <div class="owner-header">
    <div class="avatar">{{ initials(owner.name) }}</div>
    <div class="meta">
      <div class="name">{{ owner.name }}</div>
      <div class="sub">
        {{ owner.document }} · {{ petCount }} mascota{{ petCount === 1 ? '' : 's' }}
      </div>
    </div>
    <span class="step-chip">Paso 1 ✓</span>
    <button type="button" class="edit" @click="$emit('edit')">Editar</button>
  </div>
</template>

<style scoped>
.owner-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 16px;
  margin-bottom: 18px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30deg), oklch(65% 0.16 350deg));
  color: white;
  font-weight: 600;
  font-size: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 13px;
  font-weight: 500;
  color: var(--warm-900);
}

.sub {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
}

.step-chip {
  font-size: 11px;
  padding: 3px 8px;
  background: var(--warm-150);
  color: var(--warm-600);
  border-radius: 6px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}

.edit {
  background: transparent;
  border: none;
  color: var(--amatista-700);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  padding: 4px 8px;
  border-radius: 6px;
}

.edit:hover {
  background: var(--amatista-50);
}
</style>

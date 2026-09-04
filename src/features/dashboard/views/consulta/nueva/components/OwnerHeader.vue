<script setup lang="ts">
import type { Owner } from '@/types/domain'
import { initials } from '@/composables/format'
defineProps<{
  owner: Owner
  petCount: number
}>()

defineEmits<{ edit: [] }>()
</script>

<template>
  <div class="owner-header ds-flex-row ds-flex-row--12">
    <div class="avatar">{{ initials(owner.name) }}</div>
    <div class="ds-flex-fill">
      <div class="ds-item-label">{{ owner.name }}</div>
      <div class="sub ds-hint">
        {{ owner.document }} · {{ petCount }} mascota{{ petCount === 1 ? '' : 's' }}
      </div>
    </div>
    <span class="step-chip">Paso 1 ✓</span>
    <button type="button" class="edit" @click="$emit('edit')">Editar</button>
  </div>
</template>

<style scoped>
.owner-header {
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
  background: linear-gradient(135deg, var(--amatista-600), var(--amatista-800));
  color: var(--warm-50);
  font-weight: 600;
  font-size: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* Único añadido sobre `.ds-hint`: 1px, no los 2px de `--spaced`. */
.sub {
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

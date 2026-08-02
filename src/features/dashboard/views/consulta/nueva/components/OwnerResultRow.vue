<script setup lang="ts">
import { Phone } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import BaseChip from '@/features/dashboard/components/ui/BaseChip.vue'
import { initials } from '../composables/format'

defineProps<{
  owner: Owner
  petCount: number
}>()

defineEmits<{ select: [] }>()
</script>

<template>
  <button type="button" class="row" @click="$emit('select')">
    <div class="avatar">{{ initials(owner.name) }}</div>
    <div class="ident">
      <div class="name">{{ owner.name }}</div>
      <div class="doc">{{ owner.document }}</div>
    </div>
    <div class="phone">
      <Phone :size="12" :stroke-width="1.7" />
      <span>{{ owner.phone }}</span>
    </div>
    <div class="email">{{ owner.email }}</div>
    <BaseChip variant="accent"> {{ petCount }} mascota{{ petCount === 1 ? '' : 's' }} </BaseChip>
  </button>
</template>

<style scoped>
.row {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--warm-200);
  padding: 14px 18px;
  display: grid;
  grid-template-columns: 38px 1.5fr 1fr 1fr auto;
  gap: 16px;
  align-items: center;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}

.row:hover {
  background: var(--warm-100);
}

.row:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: -2px;
}

.row:last-child {
  border-bottom: none;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, oklch(78% 0.14 30deg), oklch(65% 0.16 350deg));
  color: white;
  font-weight: 600;
  font-size: 13px;
  display: grid;
  place-items: center;
}

.ident {
  min-width: 0;
}

.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
}

.doc {
  font-size: 12px;
  color: var(--warm-500);
  margin-top: 2px;
}

.phone {
  font-size: 12.5px;
  color: var(--warm-600);
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.phone span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.email {
  font-size: 12.5px;
  color: var(--warm-600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
</style>

<script setup lang="ts">
import { PawPrint } from 'lucide-vue-next'
import type { Animal, Owner } from '@/types/domain'
import BaseChip from '@/features/dashboard/components/ui/BaseChip.vue'
import { calcAge } from '../composables/format'

defineProps<{
  owner: Owner
  pet: Animal
}>()
</script>

<template>
  <div class="ctx">
    <div class="avatar">
      <PawPrint :size="18" :stroke-width="1.7" />
    </div>
    <div class="meta">
      <div class="name">
        <span>{{ pet.name }}</span>
        <span class="dim">
          · {{ pet.specie.name }} · {{ pet.breed.name }} · {{ calcAge(pet.bod) }}
        </span>
      </div>
      <div class="owner">
        Propietario: {{ owner.name }} · {{ owner.document }}
      </div>
    </div>
    <BaseChip variant="success">Pasos 1-2 ✓</BaseChip>
  </div>
</template>

<style scoped>
.ctx {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  margin-bottom: 18px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.meta {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 14px;
  font-weight: 500;
  color: var(--warm-900);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dim {
  font-size: 11.5px;
  color: var(--warm-500);
  font-weight: 400;
}
.owner {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
}
</style>

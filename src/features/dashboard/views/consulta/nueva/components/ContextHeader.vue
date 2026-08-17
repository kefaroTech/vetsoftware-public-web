<script setup lang="ts">
import { PawPrint } from 'lucide-vue-next'
import type { Animal, Owner } from '@/types/domain'
import BaseChip from '@/components/ui/BaseChip.vue'
import { calcAge } from '@/composables/format'
defineProps<{
  owner: Owner
  pet: Animal
}>()
</script>

<template>
  <div class="ctx">
    <div class="avatar ds-tone--accent">
      <PawPrint :size="18" :stroke-width="1.7" />
    </div>
    <div class="ds-flex-fill">
      <div class="name ds-item-label ds-item-label--lg ds-flex-row">
        <span>{{ pet.name }}</span>
        <span class="dim ds-hint">
          · {{ pet.specie.name }} · {{ pet.breed.name }} · {{ calcAge(pet.bod) }}
        </span>
      </div>
      <div class="owner ds-hint">Propietario: {{ owner.name }} · {{ owner.document }}</div>
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

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

/* Único añadido sobre `.ds-item-label--lg` + `.ds-flex-row`: que la línea envuelva. */
.name {
  flex-wrap: wrap;
}

/* Único añadido sobre `.ds-hint`: no heredar el peso 500 del nombre. */
.dim {
  font-weight: 400;
}

/* Único añadido sobre `.ds-hint`: 1px, no los 2px de `--spaced`. */
.owner {
  margin-top: 1px;
}
</style>

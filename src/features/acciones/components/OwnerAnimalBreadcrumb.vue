<script setup lang="ts">
import { User, PawPrint, ChevronRight, X } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'

defineProps<{
  owner: Owner
  animal: AnimalResponse
}>()

defineEmits<{ reset: [] }>()
</script>

<template>
  <div class="breadcrumb">
    <div class="crumb ds-flex-row">
      <div class="badge ds-tone--accent"><User :size="13" :stroke-width="1.7" /></div>
      <span class="ds-item-label">{{ owner.name }}</span>
      <span class="ds-hint">{{ owner.document }}</span>
    </div>
    <ChevronRight :size="14" :stroke-width="1.6" class="sep" />
    <div class="crumb ds-flex-row">
      <div class="badge paw ds-tone--accent"><PawPrint :size="13" :stroke-width="1.7" /></div>
      <span class="ds-item-label">{{ animal.name }}</span>
      <span class="ds-hint">{{ animal.specie.name }} · {{ animal.breed.name }}</span>
    </div>
    <button type="button" class="reset" @click="$emit('reset')">
      <X :size="12" :stroke-width="1.8" />
      Cambiar
    </button>
  </div>
</template>

<style scoped>
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 14px;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  margin-bottom: 14px;
  font-family: var(--font-sans);
}

/* Único añadido sobre `.ds-flex-row`: que la miga pueda encogerse. */
.crumb {
  min-width: 0;
}

/* El par fondo+texto lo pone `.ds-tone--accent`. */
.badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.badge.paw {
  border-radius: 7px;
}

.sep {
  color: var(--warm-400);
}

.reset {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 1px solid var(--warm-450);
  border-radius: 7px;
  padding: 4px 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--warm-700);
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s;
}

.reset:hover {
  background: var(--warm-50);

  /* A11Y-09: era --warm-300 (1,54:1). Con el reposo ya en --warm-450 (3,55:1)
     el hover BORRABA el borde en vez de reforzarlo; --warm-500 lo mantiene un
     escalón por encima del reposo, igual que en las primitivas. */
  border-color: var(--warm-500);
  color: var(--warm-900);
}
</style>

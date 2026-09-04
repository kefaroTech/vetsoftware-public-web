<script setup lang="ts">
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useBranches } from '../composables/useBranches'

// Selector global de sede (contexto multi-sucursal). Se muestra si la empresa tiene al menos una sede activa;
// con una sola sede permite alternar entre "Todas las sedes" y esa sede como contexto de las peticiones.
const { options, selectedValue, hasBranches, loading } = useBranches()
</script>

<template>
  <div v-if="hasBranches" class="branch-selector ds-stack">
    <span class="bs-label">Sede</span>
    <BaseSelect
      :model-value="selectedValue"
      :options="options"
      :placeholder="loading ? 'Cargando…' : 'Todas las sedes'"
      @update:model-value="selectedValue = $event"
    />
  </div>
</template>

<style scoped>
.branch-selector {
  gap: 5px;
  padding: 4px 10px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid color-mix(in oklch, var(--amatista-300) 14%, transparent);
}

.bs-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: color-mix(in oklch, var(--amatista-300) 55%, transparent);
  font-weight: 500;
}

/* En el sidebar colapsado (≤1024px, icon-only) el selector no cabe: se oculta. La sede persistida
   sigue aplicando como contexto en las peticiones. */
@media (width <= 1024px) {
  .branch-selector {
    display: none;
  }
}
</style>

<script setup lang="ts">
import BaseSelect from '@/components/ui/BaseSelect.vue'
import { useBranches } from '../composables/useBranches'

// Selector global de sede (contexto multi-sucursal). Se muestra si la empresa tiene al menos una sede activa;
// con una sola sede permite alternar entre "Todas las sedes" y esa sede como contexto de las peticiones.
const { options, selectedValue, hasBranches, loading } = useBranches()
</script>

<template>
  <div v-if="hasBranches" class="branch-selector ds-stack">
    <!-- `<label for>` y no un `<span>`: el disparador de `BaseSelect` es un
         `<button role="combobox">` cuyo nombre accesible sale de su contenido,
         así que sin la asociación el lector anuncia «Norte - Bogotá, cuadro
         combinado» y nunca dice de qué es el combo. -->
    <label class="bs-label" for="branch-selector">Sede</label>
    <BaseSelect
      id="branch-selector"
      :model-value="selectedValue"
      :options="options"
      :placeholder="loading ? 'Cargando…' : 'Todas las sedes'"
      :panel-min-width="220"
      @update:model-value="selectedValue = $event"
    />
  </div>
</template>

<style scoped>
.branch-selector {
  gap: 5px;
  padding: 4px 10px 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid oklch(75% 0.04 var(--hue) / 14%);
}

.bs-label {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(75% 0.04 var(--hue) / 55%);
  font-weight: 500;
}

/* En el raíl colapsado (≤1024 px, el ancho de la tablet de planta) el selector se compacta, pero NO
   se oculta: la sede persistida sigue aplicando como contexto de TODAS las peticiones y este es el
   único sitio del armazón que dice sobre cuál se está escribiendo. */
@media (width <= 1024px) {
  .branch-selector {
    width: 100%;
    padding: 4px 0 10px;
    gap: 3px;
  }

  .bs-label {
    font-size: 9px;
    text-align: center;
  }

  .branch-selector :deep(.trigger) {
    padding: 6px 5px;
    gap: 4px;
    font-size: 11px;
  }
}
</style>

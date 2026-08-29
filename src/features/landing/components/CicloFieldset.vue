<script setup lang="ts">
import { useId } from 'vue'
import type { Ciclo } from '../types/plans.types'

/**
 * El conmutador de ciclo de pago.
 *
 * `<fieldset>` + `<legend>` + dos `<input type="radio">` NATIVOS, no un toggle a
 * mano. El patrón Radio Group del APG sale gratis —flechas, agrupación,
 * anuncio del estado— y no hay que escribir una línea de teclado. Un toggle
 * hecho con dos `<button aria-pressed>` obligaría a implementar todo eso y a
 * mantenerlo.
 *
 * El `name` se genera con `useId()`: en `/planes` conviven este control y el de
 * la landing en historiales distintos, y dos grupos de radios con el mismo
 * `name` en el mismo documento se pisarían la selección.
 */
withDefaults(defineProps<{ legend?: string }>(), { legend: 'Cómo prefieres pagar' })

const modelValue = defineModel<Ciclo>({ required: true })

const name = useId()
</script>

<template>
  <fieldset class="land-ciclo">
    <legend class="land-ciclo-legend">{{ legend }}</legend>
    <div class="land-ciclo-opts">
      <label class="land-ciclo-opt" :class="{ 'is-on': modelValue === 'MENSUAL' }">
        <input v-model="modelValue" type="radio" :name="name" value="MENSUAL" />
        <span>Mes a mes</span>
      </label>
      <label class="land-ciclo-opt" :class="{ 'is-on': modelValue === 'ANUAL' }">
        <input v-model="modelValue" type="radio" :name="name" value="ANUAL" />
        <span>Un año <span class="land-ciclo-nota">— 2 meses gratis</span></span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.land-ciclo {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

.land-ciclo-legend {
  padding: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--pub-ink-700);
  letter-spacing: 0.01em;
}

.land-ciclo-opts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

/* El radio nativo se ve, no se esconde: es el indicador de estado que §1.4.1
   exige que no dependa solo del color de la caja. */
.land-ciclo-opt {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  border: 1px solid var(--pub-line);
  background: var(--pub-surface);
  font-size: 13.5px;
  font-weight: 600;
  color: var(--pub-ink-700);
  cursor: pointer;
}

.land-ciclo-opt.is-on {
  border-color: var(--pub-ame-600);
  color: var(--pub-ame-700);
}

.land-ciclo-opt input {
  accent-color: var(--pub-ame-600);
  width: 16px;
  height: 16px;
  margin: 0;
}

.land-ciclo-nota {
  font-weight: 500;
  color: var(--pub-ink-600);
}
</style>

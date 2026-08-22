<script setup lang="ts">
/**
 * Casilla «la muestra ya fue recolectada» del formulario de laboratorio.
 *
 * Es una pieza autónoma: un `<input type="checkbox">` nativo escondido tras un
 * control a medida, con su propio estado visual. Sale de `LabFormModal.vue`
 * entera —marcado y estilos— sin dejar nada detrás, así que el modal deja de
 * cargar con los dos tercios de CSS que sólo servían a este control.
 */
import { Check } from 'lucide-vue-next'

const model = defineModel<boolean>({ required: true })
</script>

<template>
  <label class="sample-collected" :class="{ checked: model }">
    <span class="cb-box" :class="{ checked: model }">
      <Check v-if="model" :size="12" :stroke-width="3" />
    </span>
    <input v-model="model" type="checkbox" class="ds-sr-only" />
    <div>
      <div class="title ds-text-strong ds-text-strong--md">La muestra ya fue recolectada</div>
      <div class="desc">
        Marca esta opción si la muestra está tomada y solo falta procesarla en laboratorio. El
        estado pasará a
        <strong>Pendiente por procesar</strong>.
      </div>
    </div>
  </label>
</template>

<style scoped>
.sample-collected {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--warm-100);
  border: 1.5px solid var(--warm-450);
  border-radius: 10px;
  cursor: pointer;
  margin-top: 12px;
  position: relative;
  transition:
    border-color 0.15s ease,
    background 0.12s ease;
}

/* A11Y-09: `--amatista-300` daba 1,90:1 sobre el relleno `--warm-100` de este
   control, por debajo del reposo `--warm-450` (3,35:1 sobre ese mismo relleno).
   `--amatista-450` da 3,56:1. */
.sample-collected:hover {
  border-color: var(--amatista-450);
}

.sample-collected.checked {
  background: linear-gradient(135deg, var(--warning-50), oklch(96% 0.02 var(--hue)));
  border-color: oklch(70% 0.13 75deg);
}

/* A11Y-09 · una casilla es el caso de manual de §1.4.11: sin marcar, su borde
   ES el control entero. `--warm-300` daba 1,49:1 sobre su relleno `--warm-50`;
   `--warm-450` da 3,55:1. */
.cb-box {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--warm-450);
  background: var(--warm-50);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: white;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

/* `--amatista-400` da 2,97:1: incumple por sí solo y además queda por debajo
   del reposo de la casilla, ya en 3,55:1. `--amatista-450` da 3,77:1. */
.sample-collected:hover .cb-box:not(.checked) {
  border-color: var(--amatista-450);
}

.cb-box.checked {
  background: oklch(58% 0.16 75deg);
  border-color: oklch(58% 0.16 75deg);
}

/* Residuo sobre `.ds-text-strong` + `--md` (warm-900 / peso medio / 13,5px). */
.title {
  line-height: 1.3;
}

.desc {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 3px;
  line-height: 1.5;
}

.desc strong {
  color: oklch(40% 0.13 75deg);
  font-weight: 600;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { EVENT_TYPES, TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'
import type { AgendaEvent } from '../types/agenda'

const props = defineProps<{
  modelValue: ClinicalEventType | 'ALL'
  events: AgendaEvent[]
}>()

const emit = defineEmits<{ 'update:modelValue': [v: ClinicalEventType | 'ALL'] }>()

const TYPE_ORDER: ClinicalEventType[] = [
  'CONSULTATION',
  'SURGERY',
  'VACCINATION',
  'DEWORMING',
  'HOSPITALIZATION',
  'LABORATORY_TEST',
  'DIAGNOSTIC_IMAGING',
  'PRESCRIPTION',
  'SPA',
]

const countByType = computed(() => {
  const map = new Map<ClinicalEventType, number>()
  for (const ev of props.events) {
    map.set(ev.type, (map.get(ev.type) ?? 0) + 1)
  }
  return map
})

function select(value: ClinicalEventType | 'ALL') {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="filters">
    <button
      type="button"
      class="chip all-chip ds-pill"
      :class="{ active: modelValue === 'ALL' }"
      @click="select('ALL')"
    >
      <span class="label">Todos</span>
      <span class="count">{{ events.length }}</span>
    </button>
    <button
      v-for="type in TYPE_ORDER"
      :key="type"
      type="button"
      class="chip ds-pill"
      :class="{ active: modelValue === type }"
      :style="
        modelValue === type
          ? {
              background: TYPE_COLORS[EVENT_TYPES[type].color].bg,
              color: TYPE_COLORS[EVENT_TYPES[type].color].fg,
              borderColor: TYPE_COLORS[EVENT_TYPES[type].color].fg,
            }
          : {}
      "
      @click="select(type)"
    >
      <span class="icon" aria-hidden="true">{{ EVENT_TYPES[type].icon }}</span>
      <span class="label">{{ EVENT_TYPES[type].label }}</span>
      <span class="count">{{ countByType.get(type) ?? 0 }}</span>
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

/* Resto sobre `.ds-pill`: filtro con más aire y un punto más grande. */
.chip {
  padding: var(--space-5) var(--space-12);
  font-size: var(--text-xs);
  background: transparent;
  color: var(--warm-700);
  border: 1px solid var(--warm-450);
  cursor: pointer;
  transition:
    background 0.12s ease,
    border-color 0.12s ease,
    color 0.12s ease;
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- La forma `:hover` existe (`.ds-tone--neutral-soft:hover:not(:disabled)`) pero no es adoptable: el guardián de estos chips es `.active`, no `:disabled` —nunca se deshabilitan— así que la primitiva teñiría también el chip activo, que es justo lo que `:not(.active)` evita; y aplicarla condicionalmente tampoco vale, porque la clase arrastra además la regla plana `.ds-tone--neutral-soft`, que pintaría warm-100/warm-300 en reposo sobre un chip transparente. Es el hueco que documenta primitives.css para estos tres consumidores. */
.chip:hover:not(.active) {
  background: var(--warm-100);

  /* A11Y-09: era --warm-300 (1,40:1), por debajo del reposo ya migrado a
     --warm-450 (3,54:1) — el hover apagaba el borde del chip. */
  border-color: var(--warm-500);
}

/* A11Y-09 (issue #207) · el estado activo tiene que ser el MÁS evidente, y aquí
   era el menos: el chip en reposo lleva borde `--warm-450` (3,54:1) y el activo
   se quedaba en `transparent`, con su relleno `--amatista-100` a 1,17:1 contra
   la página. La jerarquía se invierte a favor del seleccionado —no se sube a
   los dos—: `--amatista-600` da 5,36:1 contra su relleno y 6,26:1 contra la
   página, por encima del reposo (3,54:1) y del hover (5,07:1).

   Los 9 chips por tipo NO pasan por aquí: su `borderColor` va en el `:style` en
   línea de la plantilla, que gana a cualquier regla, y también valía
   `transparent`. Allí el borde toma el `fg` del propio tipo (`TYPE_COLORS`),
   que mide entre 5,77:1 (rojo) y 8,91:1 (gris) contra su propio relleno. */
.chip.active {
  background: var(--amatista-100);
  color: var(--amatista-700);
  border-color: var(--amatista-600);
}

.all-chip.active {
  background: var(--amatista-700);
  color: var(--warm-50);
}

.icon {
  font-size: 12.5px;
  line-height: 1;
}

.count {
  font-size: 11px;
  padding: 0 6px;
  border-radius: var(--radius-pill);
  background: var(--warm-100);
  color: var(--warm-700);
  min-width: 18px;
  text-align: center;
}

.chip.active .count {
  background: color-mix(in oklch, var(--warm-900) 8%, transparent);
  color: inherit;
}

.all-chip.active .count {
  background: color-mix(in oklch, var(--warm-50) 18%, transparent);
  color: var(--warm-50);
}
</style>

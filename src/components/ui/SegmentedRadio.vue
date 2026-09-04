<script setup lang="ts">
import { computed, inject, nextTick, useTemplateRef } from 'vue'
import { FieldKey } from './fieldContext'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string | null
  options: Option[]
  invalid?: boolean
  /**
   * Nombre accesible. Va PRIMERO —antes que el contexto de `BaseField`— para
   * que el grupo funcione también fuera de un `BaseField`, y para que el orden
   * en que aterricen los dos trabajos deje de importar.
   */
  ariaLabel?: string
  ariaLabelledby?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const field = inject(FieldKey, null)

/**
 * A11Y-06 — `<label for>` NO nombra a un `role="radiogroup"`: `for` solo alcanza
 * a elementos etiquetables (input/select/textarea/button…), y sobre un `<div>`
 * con rol es inerte. De ahí que el nombre viaje por `aria-labelledby` contra el
 * id del propio `<label>`, que `BaseField` publica en el contexto.
 */
const labelledBy = computed(() => props.ariaLabelledby ?? field?.labelId)
const describedBy = computed(() => field?.describedBy.value)

const buttons = useTemplateRef<HTMLButtonElement[]>('buttons')

/**
 * Tabindex móvil (APG *Radio Group*): el grupo entero consume UNA tabulación,
 * no una por opción como hasta ahora. Lo lleva la opción marcada; si no hay
 * ninguna marcada todavía, la primera.
 */
const activeIndex = computed(() => {
  const i = props.options.findIndex((o) => o.value === props.modelValue)
  return i >= 0 ? i : 0
})

/**
 * En un grupo de radios la selección SIGUE al foco: mover con las flechas marca.
 * Como el componente es controlado, el `tabindex` solo se recalcula cuando el
 * padre devuelve el nuevo `modelValue`; por eso el foco se reasigna en el tick
 * siguiente y no en el mismo.
 */
function select(index: number) {
  const opt = props.options[index]
  if (!opt) return
  emit('update:modelValue', opt.value)
  nextTick(() => buttons.value?.[index]?.focus())
}

function onKeydown(event: KeyboardEvent, index: number) {
  const n = props.options.length
  if (n === 0) return
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault()
      select((index + 1) % n)
      break
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault()
      select((index - 1 + n) % n)
      break
    case 'Home':
      event.preventDefault()
      select(0)
      break
    case 'End':
      event.preventDefault()
      select(n - 1)
      break
    case ' ':
      // Marca la opción enfocada. `preventDefault` evita el `click` que el
      // navegador dispararía luego sobre el <button>, que emitiría dos veces.
      // Enter NO se intercepta: `type="button"` no envía el formulario.
      event.preventDefault()
      select(index)
      break
  }
}
</script>

<template>
  <div
    class="segmented ds-wrap-row"
    :class="{ invalid, 'ds-field-shake': invalid }"
    role="radiogroup"
    :aria-label="ariaLabel"
    :aria-labelledby="ariaLabel ? undefined : labelledBy"
    :aria-describedby="describedBy"
    :aria-invalid="invalid || undefined"
  >
    <button
      v-for="(opt, i) in options"
      :key="opt.value"
      ref="buttons"
      type="button"
      :class="['seg', { active: modelValue === opt.value }]"
      role="radio"
      :aria-checked="modelValue === opt.value"
      :tabindex="i === activeIndex ? 0 : -1"
      @click="select(i)"
      @keydown="onKeydown($event, i)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
/* La fila que envuelve es `.ds-wrap-row` (primitives.css). */
.seg {
  background: var(--warm-50);

  /* A11Y-09 · WCAG 2.2 §1.4.11 (AA): cada opción es un control, no un
     separador. --warm-200 medía 1,23:1 sobre --warm-50; --warm-450 da 3,54:1. */
  border: 1px solid var(--warm-450);
  color: var(--warm-900);
  padding: 8px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 400;
  cursor: pointer;
  transition:
    background 0.12s,
    border-color 0.12s,
    color 0.12s;
}

/* --warm-500 (5,38:1): con el reposo en --warm-450, --warm-300 (1,48:1) dejaba
   el hover más claro que el reposo. */
.seg:hover {
  border-color: var(--warm-500);
}

.seg.active {
  background: var(--amatista-100);
  border-color: var(--amatista-700);
  color: var(--amatista-700);
  font-weight: 500;
}

.seg:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 2px;
}

/* Estado inválido: borde rojo en los botones + shake del grupo (mismo lenguaje
   visual que BaseInput/BaseSelect al fallar la validación al intentar avanzar).
   El temblor era una copia byte a byte del `@keyframes shake` bajo otro
   nombre: ahora lo pone `.ds-field-shake` desde el template. */
.segmented.invalid .seg:not(.active) {
  border-color: var(--danger-border);
  background: oklch(98.5% 0.02 25deg);
}
</style>

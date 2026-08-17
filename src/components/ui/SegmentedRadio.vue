<script setup lang="ts">
interface Option {
  value: string
  label: string
}

defineProps<{
  modelValue: string | null
  options: Option[]
  invalid?: boolean
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div
    class="segmented ds-wrap-row"
    :class="{ invalid, 'ds-field-shake': invalid }"
    role="radiogroup"
    :aria-invalid="invalid || undefined"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="['seg', { active: modelValue === opt.value }]"
      role="radio"
      :aria-checked="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
/* La fila que envuelve es `.ds-wrap-row` (primitives.css). */
.seg {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
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

.seg:hover {
  border-color: var(--warm-300);
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
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
}
</style>

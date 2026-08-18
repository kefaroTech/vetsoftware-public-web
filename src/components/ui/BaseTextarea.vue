<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    rows?: number
    id?: string
    invalid?: boolean
    disabled?: boolean
  }>(),
  { rows: 4 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

// El foco se refleja en una bandera porque `.ds-field-invalid-focus`
// (primitives.css) es una clase plana, no una regla `:focus`.
const focused = ref(false)

/**
 * Tono del campo: los tres estados son EXCLUYENTES y viajan como clase desde el
 * marcado, para que ninguna regla scoped compita con las primitivas
 * `.ds-field-*` (0,1,0). `.ds-focus-ring` se retira en inválido para que el
 * anillo rojo no compita con el amatista; `--no-outline` se mantiene siempre
 * porque sólo anula el contorno nativo.
 */
const toneClass = computed(() => {
  if (props.invalid) {
    return ['tone-text', 'ds-field-invalid', focused.value ? 'ds-field-invalid-focus' : null]
  }
  if (props.disabled) return ['tone-border', 'ds-field-disabled', 'ds-focus-ring']
  return ['tone-border', 'tone-bg', 'tone-text', 'ds-focus-ring']
})

function onBlur(event: FocusEvent) {
  focused.value = false
  emit('blur', event)
}
</script>

<template>
  <textarea
    :id="id"
    class="textarea ds-focus-ring--no-outline"
    :class="[toneClass, { invalid }]"
    :rows="rows"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-invalid="invalid || undefined"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    @focus="focused = true"
    @blur="onBlur"
  />
</template>

<style scoped>
/* La base se queda con la GEOMETRÍA. Ni `background`, ni `border-color`, ni
   `color`: en CSS scoped esta regla pesa (0,2,0) y le ganaría a
   `.ds-field-invalid` / `.ds-field-disabled` (0,1,0). El color viaja en las
   clases de tono, que el marcado aplica de forma excluyente. */
.textarea {
  width: 100%;
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.55;
  resize: vertical;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
  box-sizing: border-box;
}

/* Tono en reposo, en tres piezas porque cada estado sustituye un subconjunto
   distinto: deshabilitado cambia fondo y texto pero conserva el borde neutro;
   inválido cambia fondo y borde pero conserva el texto. Mantienen el peso
   (0,2,0) y la posición que tenía el trío dentro de `.textarea`, así que su
   resolución frente a `.ds-focus-ring:focus` no cambia. */
.tone-border {
  border-color: var(--warm-200);
}

.tone-bg {
  background: var(--warm-50);
}

.tone-text {
  color: var(--warm-900);
}

.textarea:hover:not(:focus, :disabled, .invalid) {
  border-color: var(--warm-300);
}

.textarea::placeholder {
  color: var(--warm-500);
}
</style>

<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { FieldKey } from './fieldContext'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    rows?: number
    id?: string
    invalid?: boolean
    disabled?: boolean
    readonly?: boolean
  }>(),
  { rows: 4 },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()

const field = inject(FieldKey, null)

/**
 * A11Y-04 · FORM-01 · FORM-04 — el id, la descripción y la obligatoriedad se
 * toman del `BaseField` que envuelve al campo cuando el consumidor no los pasa.
 * La prop explícita va primero: fuera de un `BaseField` el componente sigue
 * comportándose igual que antes.
 */
const controlId = computed(() => props.id ?? field?.controlId)
const describedBy = computed(() => field?.describedBy.value)
const isRequired = computed(() => field?.required.value ?? false)

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
  // Solo lectura NO es deshabilitado: el control sigue siendo operable y su
  // valor SÍ se envía. Sin `tone-*`: `.ds-field-readonly` trae borde, fondo y
  // color, y el color es el CANAL que lo separa de deshabilitado (--warm-900,
  // 16,75:1, frente al --warm-500 atenuado del otro estado).
  if (props.readonly) return ['ds-field-readonly', 'ds-focus-ring']
  return ['tone-border', 'tone-bg', 'tone-text', 'ds-focus-ring']
})

function onBlur(event: FocusEvent) {
  focused.value = false
  emit('blur', event)
}
</script>

<template>
  <textarea
    :id="controlId"
    class="textarea ds-focus-ring--no-outline"
    :class="[toneClass, { invalid, readonly }]"
    :rows="rows"
    :value="modelValue ?? ''"
    :placeholder="readonly ? undefined : placeholder"
    :disabled="disabled"
    :readonly="readonly || undefined"
    :aria-invalid="invalid || undefined"
    :aria-required="isRequired || undefined"
    :aria-describedby="describedBy"
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

/* A11Y-09 · WCAG 2.2 §1.4.11 (AA): --warm-200 medía 1,23:1 sobre --warm-50 y
   el límite del campo era invisible con poca luz. --warm-450 da 3,54:1. Es el
   escalón que tokens.css reserva para bordes de control e icono; --warm-200 se
   queda para separadores y divisores, que §1.4.11 exime por decorativos. */
.tone-border {
  border-color: var(--warm-450);
}

.tone-bg {
  background: var(--warm-50);
}

.tone-text {
  color: var(--warm-900);
}

/* --warm-500 (5,38:1): con el reposo en --warm-450, --warm-300 (1,48:1) dejaba
   el hover más claro que el reposo. */
.textarea:hover:not(:focus, :disabled, .readonly, .invalid) {
  border-color: var(--warm-500);
}

.textarea::placeholder {
  color: var(--warm-500);
}
</style>

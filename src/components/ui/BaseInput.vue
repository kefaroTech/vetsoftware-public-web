<script setup lang="ts">
import { computed, inject, ref, type Component } from 'vue'
import { FieldKey } from './fieldContext'
import { Eye, EyeOff } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue?: string | number | null
    placeholder?: string
    icon?: Component
    suffix?: string
    type?: string
    id?: string
    disabled?: boolean
    readonly?: boolean
    autocomplete?: string
    invalid?: boolean
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url' | 'decimal' | 'search' | 'none'
  }>(),
  { type: 'text' },
)

defineEmits<{
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

// Los inputs de contraseña muestran un ojo para ver/ocultar el texto en claro.
const show = ref(false)
const isPassword = computed(() => props.type === 'password')
const effectiveType = computed(() =>
  isPassword.value ? (show.value ? 'text' : 'password') : props.type,
)

// El foco se refleja en una bandera porque `.ds-field-invalid-focus`
// (primitives.css) es una clase plana, no una regla `:focus-within`.
const focused = ref(false)

/**
 * Tono del campo: los tres estados son EXCLUYENTES y viajan como clase desde el
 * marcado. Así ninguna regla scoped del componente compite con las primitivas
 * `.ds-field-*`, que pesan (0,1,0) y perderían contra cualquier `.input.estado`
 * scoped, que pesa (0,2,0). `.ds-focus-ring` se retira en inválido para que el
 * anillo rojo de `.ds-field-invalid-focus` no compita con el amatista.
 */
const toneClass = computed(() => {
  if (props.invalid) {
    return ['ds-field-invalid', focused.value ? 'ds-field-invalid-focus' : null]
  }
  if (props.disabled) return ['tone-border', 'ds-field-disabled', 'ds-focus-ring']
  // Solo lectura NO es deshabilitado: el campo sigue siendo operable (recibe
  // foco, se selecciona, se copia) y su valor SÍ se envía, así que conserva el
  // texto a contraste pleno y el anillo de foco. Sin `tone-*`: la primitiva
  // `.ds-field-readonly` ya trae borde, fondo y color.
  if (props.readonly) return ['ds-field-readonly', 'ds-focus-ring']
  return ['tone-border', 'tone-bg', 'ds-focus-ring']
})
</script>

<template>
  <label
    class="input ds-flex-row"
    :class="[toneClass, { disabled, invalid, readonly }]"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <component :is="icon" v-if="icon" :size="14" :stroke-width="1.6" class="icon ds-icon-muted" />
    <input
      :id="controlId"
      class="ds-flex-fill"
      :type="effectiveType"
      :value="modelValue ?? ''"
      :placeholder="readonly ? undefined : placeholder"
      :disabled="disabled"
      :readonly="readonly || undefined"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="invalid || undefined"
      :aria-required="isRequired || undefined"
      :aria-describedby="describedBy"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
    />
    <span v-if="suffix" class="suffix ds-hint">{{ suffix }}</span>
    <button
      v-if="isPassword"
      type="button"
      class="reveal ds-icon-muted"
      tabindex="-1"
      :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      @click.stop="show = !show"
    >
      <component :is="show ? EyeOff : Eye" :size="15" :stroke-width="1.6" />
    </button>
  </label>
</template>

<style scoped>
/* La base se queda con la GEOMETRÍA. Ni `background` ni `border-color`: en CSS
   scoped esta regla pesa (0,2,0) y le ganaría a `.ds-field-invalid` /
   `.ds-field-disabled` (0,1,0). El color vive en las clases de tono, que el
   marcado aplica de forma excluyente. */
.input {
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

/* Mismo motivo con el cursor: `.ds-field-disabled` trae `cursor: not-allowed`
   y se excluye aquí en vez de competir. */
.input:not(.disabled, .readonly) {
  cursor: text;
}

/* Tono en reposo, partido en las dos propiedades que cada estado sustituye por
   separado: el borde neutro lo comparten reposo y deshabilitado; el fondo sólo
   lo lleva reposo (en deshabilitado lo pone `.ds-field-disabled`, en inválido
   `.ds-field-invalid`). Conservan el peso (0,2,0) y la posición que tenía el
   par dentro de `.input`, así que la resolución frente a
   `.ds-focus-ring:focus-within` no cambia. */

/* A11Y-09 · WCAG 2.2 §1.4.11 (AA): --warm-200 medía 1,23:1 sobre --warm-50 y
   el límite del campo era invisible con poca luz. --warm-450 da 3,55:1. Es el
   escalón que tokens.css reserva para bordes de control e icono; --warm-200 se
   queda para separadores y divisores, que §1.4.11 exime por decorativos. */
.tone-border {
  border-color: var(--warm-450);
}

.tone-bg {
  background: var(--warm-50);
}

/* --warm-500 (5,36:1) y no --warm-300 (1,49:1): con el reposo ya en --warm-450
   el tono viejo de hover era MÁS CLARO que el de reposo, así que pasar el ratón
   aclaraba el borde en vez de reforzarlo. */
.input:hover:not(.disabled, .readonly, .invalid, :focus-within) {
  border-color: var(--warm-500);
}

.input:focus-within .icon {
  color: var(--amatista-500);
}

.input.invalid .icon {
  color: oklch(55% 0.22 25deg);
}

.icon {
  transition: color 0.15s ease;
}

input {
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: var(--warm-900);
}

input::placeholder {
  color: var(--warm-500);
}

input:disabled {
  cursor: not-allowed;
}

.suffix {
  flex-shrink: 0;
}

/* `color` + `flex-shrink` vienen de `.ds-icon-muted`. */
.reveal {
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color 0.15s ease;
}

.reveal:hover {
  color: var(--warm-700);
}

.input.disabled .reveal {
  cursor: not-allowed;
  color: var(--warm-400);
}
</style>

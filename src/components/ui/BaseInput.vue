<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
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
  return ['tone-border', 'tone-bg', 'ds-focus-ring']
})
</script>

<template>
  <label
    class="input ds-flex-row"
    :class="[toneClass, { disabled, invalid }]"
    @focusin="focused = true"
    @focusout="focused = false"
  >
    <component :is="icon" v-if="icon" :size="14" :stroke-width="1.6" class="icon ds-icon-muted" />
    <input
      :id="id"
      class="ds-flex-fill"
      :type="effectiveType"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="invalid || undefined"
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
.input:not(.disabled) {
  cursor: text;
}

/* Tono en reposo, partido en las dos propiedades que cada estado sustituye por
   separado: el borde neutro lo comparten reposo y deshabilitado; el fondo sólo
   lo lleva reposo (en deshabilitado lo pone `.ds-field-disabled`, en inválido
   `.ds-field-invalid`). Conservan el peso (0,2,0) y la posición que tenía el
   par dentro de `.input`, así que la resolución frente a
   `.ds-focus-ring:focus-within` no cambia. */
.tone-border {
  border-color: var(--warm-200);
}

.tone-bg {
  background: var(--warm-50);
}

.input:hover:not(.disabled, .invalid, :focus-within) {
  border-color: var(--warm-300);
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

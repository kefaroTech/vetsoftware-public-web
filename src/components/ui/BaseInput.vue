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
</script>

<template>
  <label
    class="input ds-flex-row ds-focus-ring"
    :class="{ disabled, invalid, 'ds-field-shake': invalid }"
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
.input {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.input:hover:not(.disabled, .invalid, :focus-within) {
  border-color: var(--warm-300);
}

.input:focus-within .icon {
  color: var(--amatista-500);
}

.input.disabled {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}

/* El temblor lo pone `.ds-field-shake` (primitives.css) desde el template.
   El par borde+fondo NO puede subir a `.ds-field-invalid`: la regla base
   `.input` ya declara `background`/`border` y en CSS scoped pesa (0,2,0),
   así que una primitiva de una sola clase (0,1,0) nunca le ganaría. Lo mismo
   con `.ds-field-invalid-focus` y `.ds-field-disabled` más abajo. */
.input.invalid {
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
}

.input.invalid:focus-within {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: 0 0 0 3px var(--danger-200);
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

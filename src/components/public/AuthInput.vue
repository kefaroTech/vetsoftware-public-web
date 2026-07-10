<script setup lang="ts">
import { ref, computed } from 'vue'

/** Input de texto/email/tel/password con ícono, focus-ring y estado de error (handoff reg-fields). */
const props = withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    type?: 'text' | 'email' | 'tel' | 'password'
    placeholder?: string
    icon?: string
    invalid?: boolean
    maxlength?: number
    autocomplete?: string
    inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'search' | 'url' | 'decimal' | 'none'
    disabled?: boolean
  }>(),
  { type: 'text', invalid: false, disabled: false },
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'blur'): void
}>()

const focused = ref(false)
const show = ref(false)

const isPassword = computed(() => props.type === 'password')
const resolvedType = computed(() =>
  isPassword.value ? (show.value ? 'text' : 'password') : props.type,
)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}
function onBlur() {
  focused.value = false
  emit('blur')
}
</script>

<template>
  <div
    class="pub-input"
    :class="{ 'is-focused': focused, 'is-invalid': invalid, 'is-disabled': disabled }"
  >
    <v-icon v-if="icon" size="15" class="pub-input-ico">{{ icon }}</v-icon>
    <input
      :id="id"
      :type="resolvedType"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :disabled="disabled"
      :aria-invalid="invalid"
      @input="onInput"
      @focus="focused = true"
      @blur="onBlur"
    />
    <button
      v-if="isPassword"
      type="button"
      class="pub-input-eye"
      :aria-label="show ? 'Ocultar contraseña' : 'Mostrar contraseña'"
      @click="show = !show"
    >
      <v-icon size="16">{{ show ? 'mdi-eye-off-outline' : 'mdi-eye-outline' }}</v-icon>
    </button>
  </div>
</template>

<style scoped>
.pub-input {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--pub-line);
  border-radius: 8px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}
.pub-input.is-focused {
  border-color: var(--pub-ame-500);
  box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.14);
}
.pub-input.is-invalid {
  border-color: var(--pub-err-tx);
}
.pub-input.is-invalid.is-focused {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}
.pub-input.is-disabled {
  background: #faf8fc;
  opacity: 0.6;
}
.pub-input-ico {
  color: #a89bbd;
  flex-shrink: 0;
}
.pub-input.is-focused .pub-input-ico {
  color: var(--pub-ame-700);
}
.pub-input input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  color: var(--pub-ink-900);
  min-width: 0;
  outline: none;
}
.pub-input-eye {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #a89bbd;
  display: grid;
  place-items: center;
  padding: 0;
}
</style>

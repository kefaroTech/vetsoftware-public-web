<script setup lang="ts">
import { ref, computed, inject, type Component } from 'vue'
import { Eye, EyeOff } from 'lucide-vue-next'
import { FieldKey } from '@/components/ui/fieldContext'

/** Input de texto/email/tel/password con ícono, focus-ring y estado de error (handoff reg-fields). */
const props = withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    type?: 'text' | 'email' | 'tel' | 'password'
    placeholder?: string
    icon?: Component
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

/**
 * TAREA 0 — el contexto que publica `AuthField`. Se lee SIEMPRE después de la
 * prop explícita (`props.id ?? field?.controlId`), igual que hacen las seis
 * primitivas de `components/ui/`: así este input sigue funcionando fuera de un
 * `AuthField` y ningún uso actual cambia de comportamiento.
 */
const field = inject(FieldKey, null)

const controlId = computed(() => props.id ?? field?.controlId)
const describedBy = computed(() => field?.describedBy.value)
const ariaRequired = computed(() => (field?.required.value ? true : undefined))

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
    <component :is="icon" v-if="icon" :size="15" class="pub-input-ico" aria-hidden="true" />
    <input
      :id="controlId"
      :type="resolvedType"
      :value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :disabled="disabled"
      :aria-invalid="invalid"
      :aria-describedby="describedBy"
      :aria-required="ariaRequired"
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
      <component :is="show ? EyeOff : Eye" :size="16" aria-hidden="true" />
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
  box-shadow: 0 0 0 3px rgb(168 85 247 / 14%);
}

.pub-input.is-invalid {
  border-color: var(--pub-err-tx-2);
}

.pub-input.is-invalid.is-focused {
  box-shadow: 0 0 0 3px rgb(185 28 28 / 12%);
}

.pub-input.is-disabled {
  background: #faf8fc;
  opacity: 0.6;
}

.pub-input-ico {
  color: var(--pub-ink-500);
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
  color: var(--pub-ink-500);
  display: grid;
  place-items: center;
  padding: 0;

  /* §2.5.8 Target Size (Minimum), AA en 2.2: el ojo era un icono de 16 px sin
     caja propia, muy por debajo de los 24×24 exigidos. */
  min-width: 24px;
  min-height: 24px;
}
</style>

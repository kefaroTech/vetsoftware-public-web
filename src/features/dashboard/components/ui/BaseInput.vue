<script setup lang="ts">
import type { Component } from 'vue'

withDefaults(
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
</script>

<template>
  <label class="input" :class="{ disabled, invalid }">
    <component
      :is="icon"
      v-if="icon"
      :size="14"
      :stroke-width="1.6"
      class="icon"
    />
    <input
      :id="id"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :autocomplete="autocomplete"
      :inputmode="inputmode"
      :aria-invalid="invalid || undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
    />
    <span v-if="suffix" class="suffix">{{ suffix }}</span>
  </label>
</template>

<style scoped>
.input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus-within {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.input.disabled {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}
.input.invalid {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.input.invalid:focus-within {
  border-color: oklch(55% 0.22 25);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25);
}
.input.invalid .icon {
  color: oklch(55% 0.22 25);
}
@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
.icon {
  color: var(--warm-500);
  flex-shrink: 0;
}
input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: var(--warm-900);
  min-width: 0;
}
input::placeholder {
  color: var(--warm-500);
}
input:disabled {
  cursor: not-allowed;
}
.suffix {
  font-size: 11.5px;
  color: var(--warm-500);
  flex-shrink: 0;
}
</style>

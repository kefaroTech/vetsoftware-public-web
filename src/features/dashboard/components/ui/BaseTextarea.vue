<script setup lang="ts">
withDefaults(
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

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()
</script>

<template>
  <textarea
    :id="id"
    class="textarea"
    :class="{ invalid }"
    :rows="rows"
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :disabled="disabled"
    :aria-invalid="invalid || undefined"
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    @blur="$emit('blur', $event)"
  />
</template>

<style scoped>
.textarea {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 12px 14px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--warm-900);
  resize: vertical;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
  box-sizing: border-box;
}
.textarea:hover:not(:focus):not(:disabled):not(.invalid) {
  border-color: var(--warm-300);
}
.textarea:focus {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.textarea::placeholder {
  color: var(--warm-500);
}
.textarea:disabled {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}
.textarea.invalid {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.textarea.invalid:focus {
  border-color: oklch(55% 0.22 25);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25);
}
@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
</style>

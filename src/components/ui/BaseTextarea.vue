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
    class="textarea ds-focus-ring ds-focus-ring--no-outline"
    :class="{ invalid, 'ds-field-shake': invalid }"
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
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
  box-sizing: border-box;
}

.textarea:hover:not(:focus, :disabled, .invalid) {
  border-color: var(--warm-300);
}

.textarea::placeholder {
  color: var(--warm-500);
}

.textarea:disabled {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}

/* El temblor lo pone `.ds-field-shake` y el `outline:none` del foco
   `.ds-focus-ring--no-outline`, los dos desde el template. Borde+fondo se
   quedan aquí: la base `.textarea` ya declara `background`/`border` y en CSS
   scoped pesa (0,2,0), por encima de `.ds-field-invalid` (0,1,0). */
.textarea.invalid {
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
}

.textarea.invalid:focus {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: 0 0 0 3px var(--danger-200);
}
</style>

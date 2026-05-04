<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'

defineProps<{
  modelValue?: string | null
  id?: string
  placeholder?: string
  min?: string
  max?: string
  invalid?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()
</script>

<template>
  <label class="date" :class="{ invalid }">
    <Calendar :size="14" :stroke-width="1.6" class="icon" />
    <input
      :id="id"
      type="date"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      :aria-invalid="invalid || undefined"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur', $event)"
    />
  </label>
</template>

<style scoped>
.date {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13.5px;
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.date:focus-within {
  border-color: var(--amatista-700);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.date.invalid {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.date.invalid:focus-within {
  border-color: oklch(55% 0.22 25);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25);
}
.date.invalid .icon {
  color: oklch(55% 0.22 25);
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
input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.55;
}
@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
</style>

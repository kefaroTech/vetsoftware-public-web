<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

interface Option {
  value: string
  label: string
}

defineProps<{
  modelValue?: string | null
  placeholder?: string
  options: Option[]
  id?: string
  disabled?: boolean
  invalid?: boolean
}>()

defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
}>()
</script>

<template>
  <label class="select" :class="{ disabled, invalid }">
    <select
      :id="id"
      :value="modelValue ?? ''"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      @blur="$emit('blur', $event)"
    >
      <option value="" disabled>{{ placeholder ?? 'Selecciona una opción' }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <ChevronDown :size="13" :stroke-width="1.8" class="chev" />
  </label>
</template>

<style scoped>
.select {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.select:focus-within {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.select.disabled {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}
.select.invalid {
  border-color: oklch(60% 0.20 25);
  background: oklch(98.5% 0.02 25);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.select.invalid:focus-within {
  border-color: oklch(55% 0.22 25);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25);
}
.select.invalid .chev {
  color: oklch(55% 0.22 25);
}
@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}
select {
  flex: 1;
  appearance: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: var(--warm-900);
  cursor: inherit;
  padding-right: 18px;
  min-width: 0;
}
select:disabled {
  color: var(--warm-500);
}
select option[value=''] {
  color: var(--warm-500);
}
.chev {
  position: absolute;
  right: 12px;
  color: var(--warm-500);
  pointer-events: none;
}
</style>

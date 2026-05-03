<script setup lang="ts">
import { Calendar } from 'lucide-vue-next'

defineProps<{
  modelValue?: string | null
  id?: string
  placeholder?: string
  min?: string
  max?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="date">
    <Calendar :size="14" :stroke-width="1.6" class="icon" />
    <input
      :id="id"
      type="date"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :min="min"
      :max="max"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
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
</style>

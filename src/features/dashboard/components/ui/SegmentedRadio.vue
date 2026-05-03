<script setup lang="ts">
interface Option {
  value: string
  label: string
}

defineProps<{
  modelValue: string | null
  options: Option[]
  name?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="segmented" role="radiogroup">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :class="['seg', { active: modelValue === opt.value }]"
      role="radio"
      :aria-checked="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.segmented {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.seg {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  color: var(--warm-900);
  padding: 8px 14px;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 400;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.seg:hover {
  border-color: var(--warm-300);
}
.seg.active {
  background: var(--amatista-100);
  border-color: var(--amatista-700);
  color: var(--amatista-700);
  font-weight: 500;
}
.seg:focus-visible {
  outline: 2px solid var(--amatista-700);
  outline-offset: 2px;
}
</style>

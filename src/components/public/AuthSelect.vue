<script setup lang="ts">
import { ref } from 'vue'

/** Select nativo estilizado con estado loading (handoff reg-fields `SelectInput`). */
withDefaults(
  defineProps<{
    modelValue: string
    id?: string
    options: { value: string; label: string }[]
    placeholder?: string
    invalid?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  { invalid: false, disabled: false, loading: false },
)
const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'blur'): void
}>()

const focused = ref(false)
function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
function onBlur() {
  focused.value = false
  emit('blur')
}
</script>

<template>
  <div class="pub-select" :class="{ 'is-focused': focused, 'is-invalid': invalid }">
    <select
      :id="id"
      :value="modelValue"
      :disabled="disabled || loading"
      :aria-invalid="invalid"
      :class="{ 'is-placeholder': !modelValue }"
      @change="onChange"
      @focus="focused = true"
      @blur="onBlur"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <span class="pub-select-tail">
      <span v-if="loading" class="pub-select-spin" />
      <v-icon v-else size="15" class="pub-select-chev">mdi-chevron-down</v-icon>
    </span>
  </div>
</template>

<style scoped>
.pub-select {
  position: relative;
}

.pub-select select {
  width: 100%;
  appearance: none;
  padding: 10px 38px 10px 12px;
  font-family: inherit;
  font-size: 14px;
  color: var(--pub-ink-900);
  background: #fff;
  border: 1px solid var(--pub-line);
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.pub-select select.is-placeholder {
  color: #a89bbd;
}

.pub-select select:disabled {
  background: #faf8fc;
  cursor: not-allowed;
  opacity: 0.6;
}

.pub-select.is-focused select {
  border-color: var(--pub-ame-500);
  box-shadow: 0 0 0 3px rgb(168 85 247 / 14%);
}

.pub-select.is-invalid select {
  border-color: var(--pub-err-tx);
}

.pub-select.is-invalid.is-focused select {
  box-shadow: 0 0 0 3px rgb(220 38 38 / 10%);
}

.pub-select-tail {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: #a89bbd;
  display: grid;
  place-items: center;
}

.pub-select-spin {
  width: 14px;
  height: 14px;
  border: 2px solid #e9d5ff;
  border-top-color: var(--pub-ame-700);
  border-radius: 50%;
  display: block;
  animation: pub-spin 0.7s linear infinite;
}
</style>

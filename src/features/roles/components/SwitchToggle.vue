<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    class="switch"
    :class="{ on: modelValue, disabled }"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="dot" />
  </button>
</template>

<style scoped>
.switch {
  width: 32px;
  height: 18px;
  border-radius: var(--radius-pill);
  border: none;
  background: var(--warm-300);
  padding: 2px;
  cursor: pointer;
  position: relative;
  transition: background 0.15s ease;
  flex-shrink: 0;
}

.switch.on {
  background: var(--amatista-600);
}

.switch.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dot {
  display: block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 20%);
  transform: translateX(0);
  transition: transform 0.15s ease;
}

.switch.on .dot {
  transform: translateX(14px);
}

.switch:focus-visible {
  outline: 2px solid var(--amatista-400);
  outline-offset: 2px;
}
</style>

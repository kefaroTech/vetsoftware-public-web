<script setup lang="ts">
interface Props {
  label: string
  index: number
  active: boolean
  done: boolean
  disabled?: boolean
  value?: string | null
}
defineProps<Props>()
const emit = defineEmits<{ (e: 'click'): void }>()

function handleClick(disabled: boolean | undefined) {
  if (disabled) return
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="crumb"
    :class="{ active, done, disabled }"
    :disabled="disabled"
    @click="handleClick(disabled)"
  >
    <span class="badge">
      <template v-if="done">✓</template>
      <template v-else>{{ index }}</template>
    </span>
    <span class="label">{{ label }}</span>
    <span v-if="value" class="value">· {{ value }}</span>
  </button>
</template>

<style scoped>
.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-500);
  cursor: pointer;
}
.crumb.done {
  color: var(--warm-700);
}
.crumb.active {
  background: var(--amatista-50);
  color: var(--amatista-700);
}
.crumb.disabled {
  opacity: 0.5;
  cursor: default;
}
.crumb:not(.disabled):hover:not(.active) {
  background: var(--warm-100);
}
.badge {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--warm-200);
  color: var(--warm-500);
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 600;
}
.crumb.done .badge {
  background: var(--amatista-200);
  color: var(--amatista-700);
}
.crumb.active .badge {
  background: var(--amatista-700);
  color: white;
}
.label {
  font-weight: 400;
}
.crumb.active .label {
  font-weight: 600;
}
.value {
  color: var(--warm-500);
  font-weight: 400;
}
</style>

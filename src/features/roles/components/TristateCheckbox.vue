<script setup lang="ts">
export type TristateValue = 'empty' | 'partial' | 'full'

const props = defineProps<{
  value: TristateValue
  ariaLabel?: string
  disabled?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

function onClick() {
  if (props.disabled) return
  emit('toggle')
}
</script>

<template>
  <button
    type="button"
    class="tri"
    :class="value"
    :aria-checked="value === 'full' ? 'true' : value === 'partial' ? 'mixed' : 'false'"
    :aria-label="ariaLabel"
    :disabled="disabled"
    role="checkbox"
    @click.stop="onClick"
  >
    <span v-if="value === 'partial'" class="mark">—</span>
    <span v-else-if="value === 'full'" class="mark">✓</span>
  </button>
</template>

<style scoped>
.tri {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--warm-400);
  background: var(--warm-50);
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
  transition:
    background 0.12s,
    border-color 0.12s;
  flex-shrink: 0;
}

.tri.partial,
.tri.full {
  background: var(--amatista-600);
  border-color: var(--amatista-600);
}

.tri:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mark {
  font-size: 10px;
  line-height: 1;
  color: #fff;
  font-weight: 700;
}

.tri:focus-visible {
  outline: 2px solid var(--amatista-400);
  outline-offset: 2px;
}
</style>

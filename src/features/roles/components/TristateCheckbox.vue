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
    :class="[
      value,
      value === 'empty' ? 'tone-empty' : 'ds-tone--accent-solid',
      { 'ds-is-disabled': disabled },
    ]"
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
/* La base se queda con la GEOMETRÍA. El relleno amatista de marcado/parcial es
   `.ds-tone--accent-solid` (primitives.css), que pesa (0,1,0) y perdería contra
   un `.tri.full` scoped, que pesa (0,3,0): por eso el tono de reposo también
   viaja como clase desde el marcado, excluyente con el otro. */
.tri {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border-width: 1.5px;
  border-style: solid;
  display: grid;
  place-items: center;
  padding: 0;
  transition:
    background 0.12s,
    border-color 0.12s;
  flex-shrink: 0;
}

.tone-empty {
  background: var(--warm-50);
  border-color: var(--warm-400);
}

/* Mismo motivo con el cursor: se declara con `:not(:disabled)` para no competir
   con `.ds-is-disabled`, que pesa (0,1,0). */
.tri:not(:disabled) {
  cursor: pointer;
}

.mark {
  font-size: 10px;
  line-height: 1;
  color: var(--warm-50);
  font-weight: 700;
}

.tri:focus-visible {
  outline: 2px solid var(--amatista-450);
  outline-offset: 2px;
}
</style>

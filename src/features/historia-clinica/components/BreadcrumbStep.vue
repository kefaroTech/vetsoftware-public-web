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
const emit = defineEmits<(e: 'click') => void>()

function handleClick(disabled: boolean | undefined) {
  if (disabled) return
  emit('click')
}
</script>

<template>
  <button
    type="button"
    class="crumb ds-flex-row"
    :class="[{ active, done, disabled }, active ? 'ds-tone--accent-soft' : 'crumb-idle']"
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
/* La base se queda con la GEOMETRÍA. El tono viaja en una clase aplicada desde la
   plantilla — `.ds-tone--accent-soft` cuando el paso está activo, `.crumb-idle`
   en reposo — y las dos son mutuamente excluyentes. Si el tono de reposo viviera
   aquí, su `[data-v]` lo dejaría en (0,2,0) y la primitiva (0,1,0) no podría
   ganarle nunca, que es justo lo que bloqueaba la migración. */
.crumb {
  padding: var(--space-6) var(--space-10);
  border-radius: 7px;
  border: none;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.crumb-idle {
  background: transparent;
  color: var(--warm-500);
}

/* `done` y `active` nunca coinciden (`done = paso > n`, `active = paso === n`),
   así que este (0,3,0) no compite con la primitiva del estado activo. */
.crumb.done {
  color: var(--warm-700);
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

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    active: boolean
    // Invitado/pendiente: creado por un admin, aún no cambia la contraseña en su primer login.
    invited?: boolean
    size?: 'md' | 'lg'
  }>(),
  { size: 'md', invited: false },
)

const state = computed<'active' | 'invited' | 'inactive'>(() =>
  !props.active ? 'inactive' : props.invited ? 'invited' : 'active',
)

const tokens = computed(() => {
  switch (state.value) {
    case 'active':
      return { bg: 'var(--success-bg)', fg: 'var(--success-fg)', dot: 'var(--success-dot)' }
    case 'invited':
      return { bg: 'var(--warning-50)', fg: 'var(--warning-900)', dot: 'var(--warning-border)' }
    default:
      return { bg: 'var(--warm-200)', fg: 'var(--warm-600)', dot: 'var(--warm-500)' }
  }
})

const label = computed(() =>
  state.value === 'active' ? 'Activo' : state.value === 'invited' ? 'Invitado' : 'Inactivo',
)
</script>

<template>
  <span
    class="pill ds-pill"
    :class="`size-${size}`"
    :style="{ background: tokens.bg, color: tokens.fg }"
  >
    <span class="ds-status-dot" :style="{ background: tokens.dot }" />
    {{ label }}
  </span>
</template>

<style scoped>
.pill.size-md {
  padding: 3px 10px;
  font-size: 12px;
}

/* El punto es `.ds-status-dot` (primitives.css); el tono va inline. */
.pill.size-lg {
  padding: 5px 12px;
  font-size: 13px;
}
</style>

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
      return { bg: 'oklch(94% 0.06 150)', fg: 'oklch(40% 0.13 150)', dot: 'oklch(55% 0.16 150)' }
    case 'invited':
      return { bg: 'oklch(95% 0.06 85)', fg: 'oklch(45% 0.13 85)', dot: 'oklch(62% 0.15 85)' }
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

<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'warn' | 'neutral' | 'danger' | 'info'

const props = defineProps<{
  label: string
  tone?: Tone
}>()

/** `neutral` y `danger` son los dos tonos cuyo par fondo+texto no está en el catálogo. */
const TONE_CLASS: Record<Tone, string> = {
  success: 'ds-tone--success',
  warn: 'ds-tone--warning',
  neutral: 'tone-neutral',
  danger: 'tone-danger',
  info: 'ds-tone--accent',
}

const toneClass = computed(() => TONE_CLASS[props.tone ?? 'neutral'])
</script>

<template>
  <span class="pill ds-pill" :class="toneClass">{{ label }}</span>
</template>

<style scoped>
/* Único añadido sobre `.ds-pill`: esta familia de estados abre un pelo la letra. */
.pill {
  letter-spacing: 0.01em;
}

.tone-neutral {
  background: var(--warm-150);
  color: var(--warm-700);
}

.tone-danger {
  background: var(--danger-150);
  color: var(--danger-900);
}
</style>

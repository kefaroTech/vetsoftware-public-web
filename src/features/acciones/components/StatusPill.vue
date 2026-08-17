<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'warn' | 'neutral' | 'danger' | 'info'

const props = defineProps<{
  label: string
  tone?: Tone
}>()

/** `info` es el único tono cuyo par fondo+texto ya vive en el catálogo. */
const TONE_CLASS: Record<Tone, string> = {
  success: 'tone-success',
  warn: 'tone-warn',
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

.tone-success {
  background: oklch(94% 0.06 145deg);
  color: oklch(38% 0.13 145deg);
}

.tone-warn {
  background: oklch(95% 0.07 80deg);
  color: oklch(40% 0.13 80deg);
}

.tone-neutral {
  background: var(--warm-150);
  color: var(--warm-700);
}

.tone-danger {
  background: oklch(94% 0.07 25deg);
  color: oklch(42% 0.18 25deg);
}
</style>

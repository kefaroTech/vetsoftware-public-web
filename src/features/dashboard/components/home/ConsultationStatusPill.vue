<script setup lang="ts">
import { computed } from 'vue'
import type { ConsultationStatus } from '../../data/mock'

const props = defineProps<{
  status: ConsultationStatus
}>()

/**
 * `tone` sigue nombrando la clase local que colorea el punto
 * (`.pill-<tone> .dot`); `ds` es el par fondo+texto de la píldora, que ya vive
 * en el catálogo. El tono de espera no tiene primitiva equivalente
 * (warm-150/warm-700 frente al warm-200/warm-600 de `.ds-tone--neutral`).
 */
const meta = computed(() => {
  switch (props.status) {
    case 'en_curso':
      return { label: 'En curso', tone: 'amatista' as const, ds: 'ds-tone--accent' }
    case 'programada':
      return { label: 'Programada', tone: 'wait' as const, ds: '' }
    case 'completada':
      return { label: 'Completada', tone: 'ok' as const, ds: 'ds-tone--success' }
  }
  return { label: props.status, tone: 'wait' as const, ds: '' }
})
</script>

<template>
  <span class="pill" :class="[`pill-${meta.tone}`, meta.ds]">
    <span class="dot ds-status-dot" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-weight: 500;
}

.pill-amatista .dot {
  background: var(--amatista-500);
}

.pill-wait {
  background: var(--warm-150);
  color: var(--warm-700);
}

.pill-wait .dot {
  background: var(--warm-500);
}

.pill-ok .dot {
  background: var(--success-dot);
}
</style>

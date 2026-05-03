<script setup lang="ts">
import { computed } from 'vue'
import type { ConsultationStatus } from '../../data/mock'

const props = defineProps<{
  status: ConsultationStatus
}>()

const meta = computed(() => {
  switch (props.status) {
    case 'en_curso':
      return { label: 'En curso', tone: 'amatista' as const }
    case 'programada':
      return { label: 'Programada', tone: 'wait' as const }
    case 'completada':
      return { label: 'Completada', tone: 'ok' as const }
  }
})
</script>

<template>
  <span class="pill" :class="`pill-${meta.tone}`">
    <span class="dot" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  font-weight: 500;
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill-amatista {
  background: var(--amatista-100);
  color: var(--amatista-700);
}
.pill-amatista .dot {
  background: var(--amatista-600);
}
.pill-wait {
  background: var(--warm-150);
  color: var(--warm-600);
}
.pill-wait .dot {
  background: var(--warm-500);
}
.pill-ok {
  background: var(--success-bg);
  color: var(--success-fg);
}
.pill-ok .dot {
  background: var(--success-dot);
}
</style>

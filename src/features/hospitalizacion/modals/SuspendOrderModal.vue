<script setup lang="ts">
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import type { OrderKind } from '../types/hospital'

defineProps<{
  open: boolean
  kind: OrderKind
  name: string
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Ban"
    accent="warn"
    :title="kind === 'med' ? '¿Suspender medicamento?' : '¿Suspender procedimiento?'"
    :subtitle="name"
    :width="500"
    @close="emit('close')"
  >
    <template #body>
      <p class="lead">Al suspender:</p>
      <ul class="facts ds-stack">
        <li>
          Se eliminan las {{ kind === 'med' ? 'tomas' : 'ejecuciones' }}
          <strong>pendientes</strong> del calendario.
        </li>
        <li>
          Las {{ kind === 'med' ? 'dosis' : 'ejecuciones' }} <strong>ya aplicadas</strong> se
          conservan (registro histórico).
        </li>
        <li>La orden queda marcada como <strong>Suspendida</strong> (no se elimina).</li>
      </ul>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="emit('confirm')">Suspender</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.lead {
  margin: 0 0 10px;
  font-size: 13.5px;
  color: var(--warm-800);
}

.facts {
  margin: 0;
  padding-left: var(--space-18);
  gap: var(--space-6);
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.45;
}

/* Acción de aviso: ámbar en lugar del amatista por defecto. */
.ds-btn--solid {
  --ds-btn-solid-bg: oklch(55% 0.16 80deg);
}
</style>

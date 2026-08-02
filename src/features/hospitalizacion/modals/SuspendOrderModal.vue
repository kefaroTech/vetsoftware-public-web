<script setup lang="ts">
import { Ban } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
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
      <ul class="facts">
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
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="emit('confirm')">Suspender</button>
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
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.45;
}

.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover {
  background: var(--warm-100);
}

.btn-primary {
  background: oklch(55% 0.16 80deg);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover {
  filter: brightness(1.05);
}
</style>

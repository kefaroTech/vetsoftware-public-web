<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'

defineProps<{
  open: boolean
  appliedCount: number
  kind: 'med' | 'proc'
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <ModalShell
    :open="open"
    :icon="ShieldAlert"
    accent="warn"
    title="Confirmar cambios"
    subtitle="Esta orden ya tiene registros aplicados"
    :width="500"
    @close="emit('close')"
  >
    <template #body>
      <p class="lead">
        Hay <strong>{{ appliedCount }}</strong>
        {{
          kind === 'med'
            ? appliedCount === 1
              ? 'dosis aplicada'
              : 'dosis aplicadas'
            : appliedCount === 1
              ? 'ejecución aplicada'
              : 'ejecuciones aplicadas'
        }}. Son un registro histórico y <strong>no se modifican</strong>.
      </p>
      <ul class="facts">
        <li>Las {{ kind === 'med' ? 'dosis' : 'ejecuciones' }} aplicadas se conservan tal cual.</li>
        <li>Solo se reprograman las pendientes con los nuevos parámetros.</li>
        <li>La fecha/hora de inicio no cambia.</li>
      </ul>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Volver</button>
      <button type="button" class="btn-primary" @click="emit('confirm')">
        Aplicar a tomas pendientes
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.lead {
  margin: 0 0 12px;
  font-size: 13.5px;
  color: var(--warm-800);
  line-height: 1.5;
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

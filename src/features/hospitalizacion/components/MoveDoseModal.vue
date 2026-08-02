<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import type { GuidelineType } from '@/types/domain'

defineProps<{
  open: boolean
  guideline: GuidelineType
  fromTime: string
  toTime: string
}>()

const emit = defineEmits<{
  confirm: [mode: 'one' | 'cascade']
  close: []
}>()
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Clock"
    title="Reprogramar toma"
    :subtitle="`Mover de ${fromTime} a ${toTime}`"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <template v-if="guideline === 'INTERVAL'">
        <p class="lead">
          Esta orden usa pauta <strong>por intervalo</strong>. Elige cómo reprogramar:
        </p>
        <ul class="opts">
          <li>
            <strong>Solo esta toma</strong> — mueve únicamente esta toma; las siguientes no cambian.
          </li>
          <li>
            <strong>Esta y las siguientes</strong> — recalcula las tomas pendientes posteriores
            sumando el intervalo desde la nueva hora.
          </li>
        </ul>
      </template>
      <p v-else class="lead">
        Esta orden usa pauta <strong>fija</strong>: se moverá solo esta toma; las demás se mantienen
        en sus horas de reloj.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <template v-if="guideline === 'INTERVAL'">
        <button type="button" class="btn-secondary" @click="emit('confirm', 'one')">
          Solo esta toma
        </button>
        <button type="button" class="btn-primary" @click="emit('confirm', 'cascade')">
          Esta y las siguientes
        </button>
      </template>
      <button v-else type="button" class="btn-primary" @click="emit('confirm', 'one')">
        Mover esta toma
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

.opts {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.45;
}

.opts strong {
  color: var(--warm-900);
}

.btn-ghost,
.btn-secondary,
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

.btn-secondary {
  background: var(--warm-100);
  border-color: var(--warm-200);
  color: var(--warm-900);
}
.btn-secondary:hover {
  background: var(--warm-200);
}

.btn-primary {
  background: var(--amatista-700);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover {
  filter: brightness(1.05);
}
</style>

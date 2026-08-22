<script setup lang="ts">
import { Clock } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
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
        <ul class="opts ds-stack ds-stack--8">
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
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <template v-if="guideline === 'INTERVAL'">
        <button type="button" class="ds-btn btn-secondary" @click="emit('confirm', 'one')">
          Solo esta toma
        </button>
        <button type="button" class="ds-btn ds-btn--solid" @click="emit('confirm', 'cascade')">
          Esta y las siguientes
        </button>
      </template>
      <button v-else type="button" class="ds-btn ds-btn--solid" @click="emit('confirm', 'one')">
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
  padding-left: var(--space-18);
  font-size: 12.5px;
  color: var(--warm-700);
  line-height: 1.45;
}

.opts strong {
  color: var(--warm-900);
}

.btn-secondary {
  background: var(--warm-100);
  border-color: var(--warm-450);
  color: var(--warm-900);
}
.btn-secondary:hover {
  background: var(--warm-200);
}
</style>

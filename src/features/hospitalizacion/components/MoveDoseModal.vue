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
          Esta orden usa pauta <strong>por intervalo</strong>. ¿Qué deseas hacer?
        </p>
        <button type="button" class="opt" @click="emit('confirm', 'one')">
          <div class="opt-title">Solo esta toma</div>
          <div class="opt-desc">Mueve únicamente esta toma; las siguientes no cambian.</div>
        </button>
        <button type="button" class="opt warn" @click="emit('confirm', 'cascade')">
          <div class="opt-title">Esta y las siguientes</div>
          <div class="opt-desc">
            Recalcula las tomas pendientes posteriores sumando el intervalo desde la
            nueva hora.
          </div>
        </button>
      </template>
      <template v-else>
        <p class="lead">
          Esta orden usa pauta <strong>fija</strong>: se moverá solo esta toma, las demás
          se mantienen en sus horas de reloj.
        </p>
        <button type="button" class="opt" @click="emit('confirm', 'one')">
          <div class="opt-title">Mover esta toma</div>
          <div class="opt-desc">Confirmar el cambio de hora de esta toma.</div>
        </button>
      </template>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.lead {
  margin: 0 0 14px;
  font-size: 13.5px;
  color: var(--warm-800);
  line-height: 1.5;
}
.opt {
  display: block;
  width: 100%;
  text-align: left;
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-left: 3px solid var(--warm-300);
  border-radius: 0 10px 10px 0;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.12s ease, background 0.12s ease;
}
.opt:hover {
  border-color: var(--amatista-300);
  border-left-color: var(--amatista-500);
  background: var(--amatista-50);
}
.opt.warn {
  background: oklch(96% 0.04 80);
  border-left-color: oklch(70% 0.13 75);
}
.opt-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--warm-900);
}
.opt-desc {
  font-size: 12px;
  color: var(--warm-600);
  margin-top: 3px;
  line-height: 1.45;
}
.btn-ghost {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 9px 16px;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-900);
}
.btn-ghost:hover { background: var(--warm-100); }
</style>

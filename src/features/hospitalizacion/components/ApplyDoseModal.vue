<script setup lang="ts">
import { computed } from 'vue'
import { CircleCheck } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'
import type { DoseSlot, OrderVM } from '../types/hospital'

const props = defineProps<{
  open: boolean
  order: OrderVM | null
  doseSlot: DoseSlot | null
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()

const isMed = computed(() => props.order?.kind === 'med')
const dose = computed(() => (props.order?.kind === 'med' ? (props.order.dose ?? '') : ''))
</script>

<template>
  <ModalShell
    :open="open"
    :icon="CircleCheck"
    :title="isMed ? '¿Registrar dosis aplicada?' : '¿Registrar procedimiento?'"
    :subtitle="
      isMed
        ? 'Se marcará la toma como administrada en este momento.'
        : 'Se marcará la ejecución como realizada en este momento.'
    "
    :width="480"
    @close="emit('close')"
  >
    <template #body>
      <dl v-if="order && doseSlot" class="facts">
        <div class="row">
          <dt>{{ isMed ? 'Medicamento' : 'Procedimiento' }}</dt>
          <dd>{{ order.name }}</dd>
        </div>
        <div v-if="isMed && dose" class="row">
          <dt>Dosis</dt>
          <dd>{{ dose }}</dd>
        </div>
        <div class="row">
          <dt>Programada</dt>
          <dd>{{ formatDateShort(doseSlot.date) }} · {{ doseSlot.time }}</dd>
        </div>
      </dl>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="ds-btn ds-btn--solid" @click="emit('confirm')">
        {{ isMed ? 'Registrar dosis' : 'Registrar' }}
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.facts {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--warm-150);
}
.row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.row dt {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
  font-weight: 500;
}

.row dd {
  margin: 0;
  font-size: 14px;
  color: var(--warm-900);
  font-weight: 500;
  text-align: right;
}

/* Acción de confirmación: verde en lugar del amatista por defecto. */
.ds-btn--solid {
  --ds-btn-solid-bg: oklch(48% 0.16 150deg);
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { LogOut } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import BaseField from '@/features/dashboard/components/ui/BaseField.vue'
import BaseSelect from '@/features/dashboard/components/ui/BaseSelect.vue'
import type { ReasonLeaving } from '@/types/domain'

const props = defineProps<{ open: boolean; patientName: string }>()
const emit = defineEmits<{ confirm: [reason: ReasonLeaving]; close: [] }>()

const reasonOptions = [
  { value: 'MEDICAL_DISCHARGE', label: 'Alta médica' },
  { value: 'HOME_TREATMENT', label: 'Tratamiento en casa' },
  { value: 'TRANSFER', label: 'Traslado' },
  { value: 'TUTOR_WISH', label: 'Decisión del tutor' },
  { value: 'ADMIN', label: 'Administrativa' },
  { value: 'DEATH', label: 'Muerte' },
  { value: 'EUTHANASIA', label: 'Eutanasia' },
]

const reason = ref<ReasonLeaving>('MEDICAL_DISCHARGE')

watch(
  () => props.open,
  (open) => {
    if (open) reason.value = 'MEDICAL_DISCHARGE'
  },
)
</script>

<template>
  <ModalShell
    :open="open"
    :icon="LogOut"
    accent="warn"
    title="Dar de alta"
    :subtitle="`Se cerrará la hospitalización de ${patientName} y saldrá del tablero.`"
    :width="520"
    @close="emit('close')"
  >
    <template #body>
      <BaseField label="Motivo del alta" required>
        <template #default="{ id }">
          <BaseSelect :id="id" v-model="reason" :options="reasonOptions" />
        </template>
      </BaseField>
      <p class="hint">
        El registro queda en la historia clínica del paciente con su fecha de alta.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cancelar</button>
      <button type="button" class="btn-primary" @click="emit('confirm', reason)">
        Confirmar alta
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.hint {
  margin: 12px 0 0;
  font-size: 12.5px;
  color: var(--warm-500);
  line-height: 1.5;
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
.btn-ghost:hover { background: var(--warm-100); }
.btn-primary {
  background: oklch(55% 0.16 80);
  color: white;
  border: none;
  padding: 9px 18px;
}
.btn-primary:hover { filter: brightness(1.05); }
</style>

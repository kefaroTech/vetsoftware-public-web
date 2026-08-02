<script setup lang="ts">
import { Syringe } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import { labCode } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

defineProps<{ open: boolean; test: LaboratoryTestResponse | null; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; close: [] }>()
</script>

<template>
  <ModalShell
    :open="open"
    :icon="Syringe"
    title="Tomar muestra"
    :subtitle="test ? `${labCode(test.id, test.date)} · ${test.testType.name}` : ''"
    compact
    :width="440"
    @close="emit('close')"
  >
    <template v-if="test" #body>
      <p class="msg">
        Confirma que la muestra de
        <strong>{{ test.animal.name }} · {{ test.animal.code }}</strong> ya fue recolectada. Pasará
        a <strong>En cola</strong> para su procesamiento.
      </p>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" :disabled="busy" @click="emit('close')">
        Cancelar
      </button>
      <button type="button" class="btn-primary" :disabled="busy" @click="emit('confirm')">
        Tomar muestra
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.msg {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-600);
  line-height: 1.55;
}

.msg strong {
  color: var(--warm-800);
  font-weight: 600;
}

.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 14px;
  border-radius: 9px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-700);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--warm-100);
}

.btn-primary {
  background: var(--amatista-700);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.btn-ghost:disabled,
.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>

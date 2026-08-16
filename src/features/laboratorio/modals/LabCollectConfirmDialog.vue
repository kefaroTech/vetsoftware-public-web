<script setup lang="ts">
import { Syringe } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import { labCode } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'

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
      <button
        type="button"
        class="ds-btn ds-btn--ghost ds-btn--snug"
        :disabled="busy"
        @click="emit('close')"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="ds-btn ds-btn--solid ds-btn--snug"
        :disabled="busy"
        @click="emit('confirm')"
      >
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
</style>

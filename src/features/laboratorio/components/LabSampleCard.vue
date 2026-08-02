<script setup lang="ts">
import { computed } from 'vue'
import { PawPrint } from 'lucide-vue-next'
import LabPriorityPill from './LabPriorityPill.vue'
import { labCode } from '../types/lab'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

export type LabActionKind = 'collect' | 'take' | 'load' | 'return' | 'validate'

const props = defineProps<{ item: LaboratoryTestResponse }>()
const emit = defineEmits<{ open: []; action: [kind: LabActionKind] }>()

interface CardAction {
  kind: LabActionKind
  label: string
  variant: 'primary' | 'ghost'
}

const actions = computed<CardAction[]>(() => {
  switch (props.item.status) {
    case 'PENDING_COLLECTION':
      return [{ kind: 'collect', label: 'Tomar muestra', variant: 'primary' }]
    case 'PENDING_PROCESSING':
      return [{ kind: 'take', label: 'Procesar muestra', variant: 'primary' }]
    case 'IN_PROGRESS':
      return [{ kind: 'load', label: 'Cargar resultados', variant: 'primary' }]
    case 'PENDING_VALIDATION':
      return [
        { kind: 'return', label: 'Devolver', variant: 'ghost' },
        { kind: 'validate', label: 'Validar', variant: 'primary' },
      ]
    default:
      return []
  }
})
</script>

<template>
  <div class="card" @click="emit('open')">
    <div class="top">
      <span class="code">{{ labCode(item.id, item.date) }}</span>
      <LabPriorityPill :prioridad="item.prioridad" />
    </div>
    <div class="test">{{ item.testType.name }}</div>
    <div class="patient">
      <span class="paw"><PawPrint :size="12" :stroke-width="1.7" /></span>
      {{ item.animal.name }} · {{ item.animal.code }}
    </div>
    <div class="date">{{ formatDateShort(item.date) }}</div>
    <div v-if="actions.length" class="actions" @click.stop>
      <button
        v-for="a in actions"
        :key="a.kind"
        type="button"
        :class="['act', a.variant]"
        @click="emit('action', a.kind)"
      >
        {{ a.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.card:hover {
  border-color: var(--amatista-300);
  box-shadow: 0 2px 8px -4px rgb(20 15 30 / 14%);
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--warm-600);
}

.test {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  line-height: 1.25;
}

.patient {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warm-600);
}

.paw {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.date {
  font-size: 11.5px;
  color: var(--warm-500);
}

.actions {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.act {
  flex: 1;
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.act.primary {
  background: var(--amatista-700);
  color: white;
}

.act.primary:hover {
  filter: brightness(1.05);
}

.act.ghost {
  background: transparent;
  border-color: var(--warm-200);
  color: var(--warm-700);
}

.act.ghost:hover {
  background: var(--warm-100);
}
</style>

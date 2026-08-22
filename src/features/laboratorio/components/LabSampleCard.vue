<script setup lang="ts">
import { computed } from 'vue'
import { PawPrint } from 'lucide-vue-next'
import LabPriorityPill from './LabPriorityPill.vue'
import { labCode } from '../types/lab'
import { formatDateShort } from '@/composables/format'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'

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
  <div class="card ds-stack" @click="emit('open')">
    <div class="top ds-flex-row">
      <span class="code">{{ labCode(item.id, item.date) }}</span>
      <LabPriorityPill :prioridad="item.prioridad" />
    </div>
    <div class="test ds-item-label">{{ item.testType.name }}</div>
    <div class="patient ds-flex-row">
      <span class="paw"><PawPrint :size="12" :stroke-width="1.7" /></span>
      {{ item.animal.name }} · {{ item.animal.code }}
    </div>
    <div class="ds-hint">{{ formatDateShort(item.date) }}</div>
    <div v-if="actions.length" class="actions ds-actions ds-actions--start" @click.stop>
      <button
        v-for="a in actions"
        :key="a.kind"
        type="button"
        :class="['act', 'ds-btn', a.variant === 'primary' ? 'ds-btn--solid' : 'ds-btn--ghost']"
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
  border: 1px solid var(--warm-450);
  border-radius: 12px;
  padding: 12px;
  gap: var(--space-6);
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

/* A11Y-09: `--amatista-300` daba 2,02:1, por debajo del reposo `--warm-450`
   (3,55:1). `--amatista-450` da 3,77:1. */
.card:hover {
  border-color: var(--amatista-450);
  box-shadow: 0 2px 8px -4px rgb(20 15 30 / 14%);
}

.top {
  justify-content: space-between;
}

.code {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--warm-600);
}

.test {
  font-size: var(--text-lg);
  line-height: 1.25;
}

/* Resto sobre `.ds-flex-row`: gap propio (6px). */
.patient {
  gap: var(--space-6);
  color: var(--warm-600);
  font-size: var(--text-xs);
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

.actions {
  margin-top: var(--space-4);
}

/* Resto sobre `.ds-btn` (+ --solid / --ghost según la variante): estas
   acciones se reparten el ancho de la tarjeta y van un punto más compactas. */
.act {
  flex: 1;
  padding: var(--space-6) var(--space-10);
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
}
</style>

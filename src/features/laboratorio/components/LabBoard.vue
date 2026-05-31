<script setup lang="ts">
import { computed } from 'vue'
import LabSampleCard, { type LabActionKind } from './LabSampleCard.vue'
import { BOARD_COLUMNS } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

const props = defineProps<{ items: LaboratoryTestResponse[]; loading: boolean }>()
const emit = defineEmits<{
  open: [item: LaboratoryTestResponse]
  action: [item: LaboratoryTestResponse, kind: LabActionKind]
}>()

const columns = computed(() =>
  BOARD_COLUMNS.map((col) => ({
    ...col,
    items: props.items.filter((i) => i.status === col.status),
  })),
)
</script>

<template>
  <div class="board">
    <section v-for="col in columns" :key="col.status" class="column" :data-status="col.status">
      <header class="col-head">
        <span class="col-title">{{ col.label }}</span>
        <span class="col-count">{{ col.items.length }}</span>
      </header>
      <div class="col-body">
        <p v-if="!loading && col.items.length === 0" class="empty">Sin muestras</p>
        <LabSampleCard
          v-for="item in col.items"
          :key="item.id"
          :item="item"
          @open="emit('open', item)"
          @action="(kind) => emit('action', item, kind)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 900px) {
  .board { grid-template-columns: 1fr; }
}
.column {
  background: var(--warm-100);
  border: 1px solid var(--warm-200);
  border-radius: 14px;
  border-top: 3px solid var(--warm-300);
  padding: 12px;
  min-height: 200px;
}
.column[data-status='PENDING_PROCESSING'] { border-top-color: oklch(65% 0.15 75); }
.column[data-status='IN_PROGRESS'] { border-top-color: oklch(55% 0.16 240); }
.column[data-status='PENDING_VALIDATION'] { border-top-color: oklch(55% 0.18 280); }
.col-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 0 2px;
}
.col-title {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-700);
}
.col-count {
  font-size: 12px;
  font-weight: 600;
  color: var(--warm-600);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 999px;
  min-width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  padding: 0 6px;
}
.col-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty {
  font-size: 12.5px;
  color: var(--warm-500);
  text-align: center;
  padding: 16px 0;
}
</style>

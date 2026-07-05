<script setup lang="ts">
import { computed } from 'vue'
import { Syringe, Inbox, Microscope, ClipboardCheck } from 'lucide-vue-next'
import type { Component } from 'vue'
import LabSampleCard, { type LabActionKind } from './LabSampleCard.vue'
import { BOARD_COLUMNS } from '../types/lab'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'

const props = defineProps<{ items: LaboratoryTestResponse[]; loading: boolean }>()
const emit = defineEmits<{
  open: [item: LaboratoryTestResponse]
  action: [item: LaboratoryTestResponse, kind: LabActionKind]
}>()

interface ColumnMeta {
  icon: Component
  bg: string
  fg: string
}

const COLUMN_META: Record<string, ColumnMeta> = {
  PENDING_COLLECTION: { icon: Syringe, bg: 'var(--warm-200)', fg: 'var(--warm-700)' },
  PENDING_PROCESSING: { icon: Inbox, bg: 'oklch(94% 0.07 80)', fg: 'oklch(45% 0.13 70)' },
  IN_PROGRESS: { icon: Microscope, bg: 'oklch(94% 0.04 240)', fg: 'oklch(40% 0.15 240)' },
  PENDING_VALIDATION: { icon: ClipboardCheck, bg: 'oklch(94% 0.05 280)', fg: 'oklch(40% 0.16 280)' },
}

const FALLBACK_META: ColumnMeta = { icon: Inbox, bg: 'var(--warm-50)', fg: 'var(--warm-600)' }

const columns = computed(() =>
  BOARD_COLUMNS.map((col) => ({
    ...col,
    meta: COLUMN_META[col.status] ?? FALLBACK_META,
    items: props.items.filter((i) => i.status === col.status),
  })),
)
</script>

<template>
  <div class="board">
    <section v-for="col in columns" :key="col.status" class="column" :data-status="col.status">
      <header class="col-head">
        <span class="col-title">
          <component :is="col.meta.icon" :size="15" :stroke-width="1.7" />
          {{ col.label }}
        </span>
        <span
          class="col-count"
          :style="{ background: col.meta.bg, color: col.meta.fg }"
          >{{ col.items.length }}</span
        >
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
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1100px) {
  .board { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
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
.column[data-status='PENDING_COLLECTION'] { border-top-color: var(--warm-400); }
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
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--warm-800);
}
.col-count {
  font-size: 12px;
  font-weight: 600;
  border-radius: 11px;
  min-width: 22px;
  height: 22px;
  display: inline-grid;
  place-items: center;
  padding: 0 7px;
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

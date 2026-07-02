<script setup lang="ts">
import { computed } from 'vue'
import DetailField from '../DetailField.vue'
import EventTypeChip from '../EventTypeChip.vue'
import { formatEventDate } from '../../composables/format'
import { EVENT_TYPES } from '../../constants/eventTypes'
import type { ClinicalEvent } from '../../types/historia'
import type { ConsultationResponse } from '@/features/dashboard/views/consulta/nueva/api/consultation.api'

const props = withDefaults(
  defineProps<{
    data: ConsultationResponse
    children?: ClinicalEvent[]
  }>(),
  { children: () => [] },
)

function clean(v: string | null | undefined): string | null {
  if (!v) return null
  const trimmed = v.trim()
  if (trimmed === '' || trimmed === '-') return null
  return v
}

const childrenSorted = computed(() =>
  [...props.children].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
)

const childrenCountLabel = computed(() =>
  props.children.length === 1 ? '1 ítem' : `${props.children.length} ítems`,
)
</script>

<template>
  <div class="detail-grid">
    <DetailField label="Tipo de consulta" :value="data.consultationType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField
      label="Próximo control"
      :value="data.nextControl ? formatEventDate(data.nextControl) : null"
    />
    <DetailField label="Anamnesis" :value="clean(data.anamnesis)" span="full" />
    <DetailField label="Diagnóstico" :value="clean(data.diagnosis)" span="full" />
    <DetailField label="Plan diagnóstico" :value="clean(data.diagnosisPlan)" span="full" />
    <DetailField label="Plan terapéutico" :value="clean(data.therapeuticPlan)" span="full" />

    <div class="children-section">
      <div class="children-head">
        <span class="children-label">Procedimientos asociados</span>
        <span class="children-count">{{ childrenCountLabel }}</span>
      </div>
      <div v-if="children.length === 0" class="empty">
        Esta consulta no tiene procedimientos asociados.
      </div>
      <ul v-else class="children-list">
        <li
          v-for="c in childrenSorted"
          :key="`${c.eventType}-${c.sourceId}`"
          class="child"
        >
          <span class="child-icon" :aria-label="EVENT_TYPES[c.eventType].label">
            {{ EVENT_TYPES[c.eventType].icon }}
          </span>
          <div class="child-body">
            <div class="child-head">
              <EventTypeChip :type="c.eventType" />
              <span class="child-date">{{ formatEventDate(c.eventDate) }}</span>
              <span class="child-id">#{{ c.sourceId }}</span>
            </div>
            <div class="child-summary">
              {{ c.summary || 'Sin descripción' }}
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 24px;
}
@media (max-width: 560px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

.children-section {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.children-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.children-label {
  font-size: 11.5px;
  color: var(--warm-500);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-weight: 500;
}
.children-count {
  font-size: 11.5px;
  color: var(--warm-400);
}
.empty {
  padding: 14px 16px;
  font-size: 13px;
  color: var(--warm-500);
  background: var(--warm-50);
  border: 1px dashed var(--warm-200);
  border-radius: 10px;
}
.children-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.child {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px;
}
.child-icon {
  font-size: 18px;
  line-height: 1;
  margin-top: 2px;
  flex-shrink: 0;
}
.child-body {
  flex: 1;
  min-width: 0;
}
.child-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.child-date {
  font-size: 12px;
  color: var(--warm-500);
}
.child-id {
  font-size: 11px;
  color: var(--warm-400);
  font-family: var(--font-mono);
}
.child-summary {
  font-size: 13px;
  color: var(--warm-800);
  line-height: 1.45;
  word-break: break-word;
}
</style>

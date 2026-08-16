<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import DetailField from '../DetailField.vue'
import EventTypeChip from '../EventTypeChip.vue'
import { formatEventDate } from '../../composables/format'
import { EVENT_TYPES, EVENT_TYPE_DETAILABLE } from '../../constants/eventTypes'
import type { ClinicalEvent } from '../../types/historia'
import type { ConsultationResponse } from '@/features/dashboard/views/consulta/nueva/types/consultation.types'

const props = withDefaults(
  defineProps<{
    data: ConsultationResponse
    children?: ClinicalEvent[]
  }>(),
  { children: () => [] },
)

// Al clickear un procedimiento asociado, el padre abre su detalle en el modal.
const emit = defineEmits<{ select: [event: ClinicalEvent] }>()

function isNavigable(c: ClinicalEvent): boolean {
  return EVENT_TYPE_DETAILABLE.has(c.eventType)
}
function openChild(c: ClinicalEvent): void {
  if (isNavigable(c)) emit('select', c)
}

function clean(v: string | null | undefined): string | null {
  if (!v) return null
  const trimmed = v.trim()
  if (trimmed === '' || trimmed === '-') return null
  return v
}

// Constantes vitales (Fase 3): muestran valor + unidad solo cuando hay dato.
function withUnit(v: number | null | undefined, unit: string): string | null {
  return v == null ? null : `${v} ${unit}`
}
function score(v: number | null | undefined, max: number): string | null {
  return v == null ? null : `${v}/${max}`
}

const hasExam = computed(() => {
  const d = props.data
  return (
    d.temperature != null ||
    d.heartRate != null ||
    d.respiratoryRate != null ||
    d.bodyConditionScore != null ||
    d.painScore != null ||
    !!clean(d.mucousMembranes) ||
    !!clean(d.capillaryRefill) ||
    !!clean(d.hydration) ||
    !!clean(d.attitude) ||
    !!clean(d.examFindings)
  )
})

const childrenSorted = computed(() =>
  [...props.children].sort((a, b) => b.eventDate.localeCompare(a.eventDate)),
)

const childrenCountLabel = computed(() =>
  props.children.length === 1 ? '1 ítem' : `${props.children.length} ítems`,
)
</script>

<template>
  <div class="ds-detail-grid">
    <DetailField label="Tipo de consulta" :value="data.consultationType.name" />
    <DetailField label="Fecha" :value="formatEventDate(data.date)" />
    <DetailField
      label="Próximo control"
      :value="data.nextControl ? formatEventDate(data.nextControl) : null"
    />
    <DetailField label="Anamnesis" :value="clean(data.anamnesis)" span="full" />

    <template v-if="hasExam">
      <DetailField
        v-if="data.temperature != null"
        label="Temperatura"
        :value="withUnit(data.temperature, '°C')"
      />
      <DetailField
        v-if="data.heartRate != null"
        label="Frec. cardíaca"
        :value="withUnit(data.heartRate, 'lpm')"
      />
      <DetailField
        v-if="data.respiratoryRate != null"
        label="Frec. respiratoria"
        :value="withUnit(data.respiratoryRate, 'rpm')"
      />
      <DetailField
        v-if="clean(data.mucousMembranes)"
        label="Mucosas"
        :value="data.mucousMembranes"
      />
      <DetailField
        v-if="clean(data.capillaryRefill)"
        label="Llenado capilar"
        :value="data.capillaryRefill"
      />
      <DetailField v-if="clean(data.hydration)" label="Hidratación" :value="data.hydration" />
      <DetailField
        v-if="data.bodyConditionScore != null"
        label="Condición corporal"
        :value="score(data.bodyConditionScore, 9)"
      />
      <DetailField
        v-if="data.painScore != null"
        label="Escala de dolor"
        :value="score(data.painScore, 10)"
      />
      <DetailField v-if="clean(data.attitude)" label="Actitud" :value="data.attitude" />
      <DetailField
        v-if="clean(data.examFindings)"
        label="Hallazgos al examen"
        :value="data.examFindings"
        span="full"
      />
    </template>

    <DetailField label="Diagnóstico" :value="clean(data.diagnosis)" span="full" />
    <DetailField
      v-if="clean(data.prognosis)"
      label="Pronóstico"
      :value="data.prognosis"
      span="full"
    />

    <div class="children-section">
      <div class="children-head">
        <span class="children-label">Procedimientos asociados</span>
        <span class="children-count">{{ childrenCountLabel }}</span>
      </div>
      <div v-if="children.length === 0" class="ds-empty ds-empty--boxed">
        Esta consulta no tiene procedimientos asociados.
      </div>
      <ul v-else class="children-list">
        <li v-for="c in childrenSorted" :key="`${c.eventType}-${c.sourceId}`">
          <button
            type="button"
            class="child"
            :class="{ navigable: isNavigable(c) }"
            :disabled="!isNavigable(c)"
            @click="openChild(c)"
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
            <ChevronRight v-if="isNavigable(c)" class="child-chev" :size="16" :stroke-width="1.6" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
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
  width: 100%;
  text-align: left;
  font-family: inherit;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  padding: 10px 14px;
  cursor: default;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.child.navigable {
  cursor: pointer;
}

.child.navigable:hover {
  border-color: var(--amatista-300);
  background: var(--amatista-50);
}

.child-chev {
  color: var(--warm-400);
  align-self: center;
  flex-shrink: 0;
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
  overflow-wrap: anywhere;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import ModalShell from '@/components/ui/ModalShell.vue'
import { EVENT_TYPES, TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import type { AgendaEvent } from '../types/agenda'

const props = defineProps<{ event: AgendaEvent | null }>()
defineEmits<{ close: [] }>()

const open = computed(() => props.event !== null)

const meta = computed(() => (props.event ? EVENT_TYPES[props.event.type] : null))
const tokens = computed(() => (meta.value ? TYPE_COLORS[meta.value.color] : null))

const rangeLabel = computed(() => {
  const ev = props.event
  if (!ev) return ''
  if (ev.endDate && ev.endDate !== ev.date) {
    return `${ev.date} → ${ev.endDate}`
  }
  return ev.date
})
</script>

<template>
  <ModalShell
    :open="open"
    :title="event && meta ? meta.label : 'Evento'"
    :subtitle="rangeLabel"
    accent="amatista"
    :width="520"
    @close="$emit('close')"
  >
    <template #body>
      <div v-if="event && meta && tokens" class="body">
        <div class="header-row">
          <span class="badge" :style="{ background: tokens.bg, color: tokens.fg }">
            <span aria-hidden="true">{{ meta.icon }}</span>
            {{ meta.label }}
          </span>
        </div>

        <dl class="fields">
          <div class="field">
            <dt>Fecha</dt>
            <dd>{{ rangeLabel }}</dd>
          </div>
          <div class="field">
            <dt>Resumen</dt>
            <dd>{{ event.subtitle || '—' }}</dd>
          </div>
          <div class="field">
            <dt>Paciente (ID)</dt>
            <dd>#{{ event.animalId }}</dd>
          </div>
          <div v-if="event.consultationId" class="field">
            <dt>Consulta asociada</dt>
            <dd>#{{ event.consultationId }}</dd>
          </div>
        </dl>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="$emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-size: 12.5px;
  font-weight: 500;
}

.fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 0;
}

.field {
  border-bottom: 1px solid var(--warm-150);
  padding-bottom: 10px;
}

.field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.field dt {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--warm-500);
  margin-bottom: 4px;
}

.field dd {
  margin: 0;
  font-size: 13.5px;
  color: var(--warm-900);
}
</style>

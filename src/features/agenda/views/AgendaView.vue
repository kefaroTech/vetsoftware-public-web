<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowLeft, Plus } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import AgendaToolbar from '../components/AgendaToolbar.vue'
import AgendaFilters from '../components/AgendaFilters.vue'
import AgendaMonthView from '../components/AgendaMonthView.vue'
import AgendaWeekView from '../components/AgendaWeekView.vue'
import AgendaDayView from '../components/AgendaDayView.vue'
import AgendaEventDetailModal from '../components/AgendaEventDetailModal.vue'
import { useAgendaEvents } from '../composables/useAgendaEvents'
import type { AgendaEvent } from '../types/agenda'
import type { ClinicalEventType } from '@/features/historia-clinica/types/historia'

type ViewMode = 'month' | 'week' | 'day'

const view = ref<ViewMode>('month')
const previousView = ref<ViewMode | null>(null)
const cursor = ref<Date>(new Date())
const filter = ref<ClinicalEventType | 'ALL'>('ALL')
const selectedEvent = ref<AgendaEvent | null>(null)

const { events: allEvents, loading, error } = useAgendaEvents(cursor)

const filteredEvents = computed(() =>
  filter.value === 'ALL'
    ? allEvents.value
    : allEvents.value.filter((ev) => ev.type === filter.value),
)

function goToDay(day: Date) {
  cursor.value = day
  previousView.value = view.value
  view.value = 'day'
}

function setViewDirect(v: ViewMode) {
  if (v !== 'day') previousView.value = null
  // El v-model:view también actualiza view.value; este handler limpia el "previous"
  // cuando el cambio viene del toggle del toolbar (no de un click en un día).
}

function onUpdateView(v: ViewMode) {
  view.value = v
}

function goBack() {
  if (previousView.value) {
    view.value = previousView.value
    previousView.value = null
  }
}

const backLabel = computed(() =>
  previousView.value === 'month' ? 'Volver al mes' : 'Volver a la semana',
)
</script>

<template>
  <section class="agenda-page">
    <PageHeader
      kicker="Calendario · Equipo"
      title="Agenda"
      lead="Vista cronológica de consultas, cirugías, hospitalizaciones, vacunaciones, exámenes y spa."
    >
      <template #action>
        <button
          type="button"
          class="cta"
          disabled
          title="Próximamente"
        >
          <Plus :size="16" :stroke-width="1.8" />
          Nuevo evento
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="banner error">{{ error }}</div>

    <AgendaToolbar
      :view="view"
      :cursor="cursor"
      @update:view="onUpdateView"
      @update:cursor="(d: Date) => (cursor = d)"
      @set-view="setViewDirect"
    />

    <AgendaFilters v-model="filter" :events="allEvents" />

    <button
      v-if="view === 'day' && previousView"
      type="button"
      class="back-btn"
      @click="goBack"
    >
      <ArrowLeft :size="14" :stroke-width="1.8" />
      {{ backLabel }}
    </button>

    <div class="body">
      <div v-if="loading && allEvents.length === 0" class="loading">
        Cargando eventos…
      </div>
      <AgendaMonthView
        v-else-if="view === 'month'"
        :cursor="cursor"
        :events="filteredEvents"
        @day-click="goToDay"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
      />
      <AgendaWeekView
        v-else-if="view === 'week'"
        :cursor="cursor"
        :events="filteredEvents"
        @day-click="goToDay"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
      />
      <AgendaDayView
        v-else
        :cursor="cursor"
        :events="filteredEvents"
        @event-click="(ev: AgendaEvent) => (selectedEvent = ev)"
      />
    </div>

    <AgendaEventDetailModal
      :event="selectedEvent"
      @close="selectedEvent = null"
    />
  </section>
</template>

<style scoped>
.agenda-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 1320px;
  margin: 0 auto;
  font-family: var(--font-sans);
  color: var(--warm-900);
}
.cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: white;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  white-space: nowrap;
}
.cta:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.banner.error {
  background: oklch(95% 0.06 25);
  border: 1px solid oklch(85% 0.12 25);
  color: oklch(40% 0.18 25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
}
.back-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: transparent;
  color: var(--warm-700);
  border: 1px solid var(--warm-200);
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
}
.back-btn:hover {
  background: var(--amatista-50);
  border-color: var(--amatista-300);
  color: var(--amatista-700);
}
.body {
  min-height: 600px;
}
.loading {
  padding: 28px;
  text-align: center;
  background: var(--warm-100);
  border: 1px dashed var(--warm-300);
  border-radius: 12px;
  color: var(--warm-500);
  font-size: 13px;
}
</style>

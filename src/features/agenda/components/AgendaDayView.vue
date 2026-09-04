<script setup lang="ts">
import { computed } from 'vue'
import { CalendarOff, Plus } from 'lucide-vue-next'
import AppointmentCard from './AppointmentCard.vue'
import { EVENT_TYPES, TYPE_COLORS } from '@/features/historia-clinica/constants/eventTypes'
import { isoFromDate } from '../composables/dateUtils'
import { itemsOnDay, type AgendaEvent, type AgendaItem } from '../types/agenda'
import { apptHour, type AppointmentResponse } from '../types/appointment'

const props = defineProps<{
  cursor: Date
  items: AgendaItem[]
  canCreate: boolean
}>()

const emit = defineEmits<{
  'appointment-click': [appt: AppointmentResponse]
  'event-click': [ev: AgendaEvent]
  new: []
}>()

const dayItems = computed(() => itemsOnDay(props.items, isoFromDate(props.cursor)))

const appointments = computed(() =>
  dayItems.value.flatMap((it) => (it.kind === 'appointment' ? [it.appt] : [])),
)
const clinicalEvents = computed(() =>
  dayItems.value.flatMap((it) => (it.kind === 'clinical' ? [it.event] : [])),
)

// Agrupa las citas por hora (timeline).
const hourGroups = computed<[number, AppointmentResponse[]][]>(() => {
  const map = new Map<number, AppointmentResponse[]>()
  for (const a of appointments.value) {
    const h = apptHour(a.startAt)
    const group = map.get(h)
    if (group) group.push(a)
    else map.set(h, [a])
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0])
})

const isEmpty = computed(() => appointments.value.length === 0 && clinicalEvents.value.length === 0)
</script>

<template>
  <div class="day-view">
    <div v-if="isEmpty" class="day-empty ds-empty">
      <CalendarOff :size="32" :stroke-width="1.5" class="empty-icon" aria-hidden="true" />
      <div class="empty-text">No hay citas para este día.</div>
      <button
        v-if="canCreate"
        type="button"
        class="ds-btn ds-btn--solid new-appt"
        @click="emit('new')"
      >
        <Plus :size="15" :stroke-width="1.8" /> Agendar una cita
      </button>
    </div>

    <template v-else>
      <div v-if="appointments.length > 0" class="timeline ds-stack">
        <div v-for="[hour, groupItems] in hourGroups" :key="hour" class="hour-group">
          <div class="hour-rail">
            <div class="hour-num">{{ String(hour).padStart(2, '0') }}:00</div>
            <div class="hour-line" />
          </div>
          <div class="hour-cards ds-stack ds-stack--8">
            <AppointmentCard
              v-for="a in groupItems"
              :key="a.id"
              :appt="a"
              @click="emit('appointment-click', a)"
            />
          </div>
        </div>
      </div>

      <!-- Eventos clínicos del día (read-only) -->
      <div v-if="clinicalEvents.length > 0" class="clinical">
        <div class="clinical-title">Eventos clínicos del día</div>
        <ul class="ds-list-reset ds-stack ds-stack--8">
          <li v-for="ev in clinicalEvents" :key="ev.id" class="clinical-row">
            <button
              type="button"
              class="clinical-btn ds-tone--accent-selected"
              @click="emit('event-click', ev)"
            >
              <span
                class="dot"
                :style="{ background: TYPE_COLORS[EVENT_TYPES[ev.type].color].dot }"
              />
              <component
                :is="EVENT_TYPES[ev.type].icon"
                :size="18"
                :stroke-width="1.7"
                class="icon"
                aria-hidden="true"
              />
              <span class="text ds-stack">
                <span class="title">{{ ev.title }}</span>
                <span v-if="ev.subtitle" class="subtitle">{{ ev.subtitle }}</span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>

<style scoped>
.day-view {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  padding: 14px 12px;
  min-height: 600px;
}

/* Resto sobre `.ds-empty`: este vacío respira más que el catalogado. */
.day-empty {
  padding: 60px var(--space-20);
}

.empty-icon {
  margin-bottom: 8px;
  color: var(--warm-400);
}

.empty-text {
  font-size: 14px;
}

.timeline {
  padding: var(--space-6) var(--space-6) 0;
}

.hour-group {
  display: grid;
  grid-template-columns: 62px 1fr;
  gap: 14px;
}

.hour-rail {
  padding-top: 6px;
  position: relative;
}

.hour-num {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--warm-500);
  font-weight: 500;
  text-align: right;
}

.hour-line {
  position: absolute;
  top: 26px;
  bottom: 0;
  right: -7px;
  width: 1px;
  background: var(--warm-200);
}

.hour-cards {
  padding-bottom: var(--space-14);
}

.clinical {
  margin-top: 6px;
  padding: 14px 8px 8px;
  border-top: 1px dashed var(--warm-200);
}

.clinical-title {
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--warm-500);
  font-weight: 600;
  margin-bottom: 10px;
}

.clinical-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: pointer;
  font-family: inherit;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

/* El estado `:hover` lo pinta `.ds-tone--accent-selected:hover:not(:disabled)`
   (primitives.css) — aplicada desde el marcado, ver arriba. Su forma plana
   (0,1,0) no toca el reposo: `.clinical-btn` scoped es (0,2,0) y conserva
   `--warm-50` + `border: 1px solid var(--warm-450)`. */

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

.icon {
  flex-shrink: 0;
}

.text {
  gap: var(--space-3);
  min-width: 0;
}

.title {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
}

.subtitle {
  font-size: 12px;
  color: var(--warm-600);
}

/* El botón usa `.ds-btn`; sólo conserva su separación superior. */
.new-appt {
  margin-top: var(--space-16);
}
</style>

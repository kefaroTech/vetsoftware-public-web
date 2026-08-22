<script setup lang="ts">
import { computed } from 'vue'
import {
  addDays,
  isoFromDate,
  sameDay,
  startOfMonth,
  startOfWeek,
  WEEKDAYS_SHORT,
} from '../composables/dateUtils'
import AgendaEventChip from './AgendaEventChip.vue'
import AppointmentChip from './AppointmentChip.vue'
import { indexItemsByDay, type AgendaItem } from '../types/agenda'
import type { AgendaEvent } from '../types/agenda'
import type { AppointmentResponse } from '../types/appointment'

const props = defineProps<{
  cursor: Date
  items: AgendaItem[]
}>()

const emit = defineEmits<{
  'day-click': [d: Date]
  'appointment-click': [appt: AppointmentResponse]
  'event-click': [ev: AgendaEvent]
}>()

const today = new Date()

const days = computed<Date[]>(() => {
  const start = startOfWeek(startOfMonth(props.cursor))
  return Array.from({ length: 42 }, (_, i) => addDays(start, i))
})

const cursorMonth = computed(() => props.cursor.getMonth())

const MAX_VISIBLE = 3

const isos = computed<string[]>(() => days.value.map(isoFromDate))

/** Índice único por render. Expande los rangos clínicos: ver `indexItemsByDay`. */
const byDay = computed(() => indexItemsByDay(props.items, isos.value))

/** Referencia estable para los días sin items: evita crear un array nuevo por celda. */
const EMPTY: AgendaItem[] = []

/**
 * Todo lo que la plantilla necesita, resuelto una vez por celda.
 * La plantilla no llama a ninguna función: una función en plantilla se reevalúa en
 * cada render y no se cachea; este `computed` sí.
 */
const cells = computed(() =>
  days.value.map((day, i) => {
    const iso = isos.value[i] as string
    const items = byDay.value.get(iso) ?? EMPTY
    return {
      iso,
      day,
      count: items.length,
      visible: items.slice(0, MAX_VISIBLE),
      overflow: items.length - MAX_VISIBLE,
      otherMonth: day.getMonth() !== cursorMonth.value,
      isToday: sameDay(day, today),
    }
  }),
)
</script>

<template>
  <div class="month">
    <div class="weekday-header">
      <div v-for="wd in WEEKDAYS_SHORT" :key="wd" class="weekday">{{ wd }}</div>
    </div>
    <div class="grid">
      <button
        v-for="cell in cells"
        :key="cell.iso"
        type="button"
        class="cell ds-stack ds-tone--neutral-soft"
        :class="{ 'other-month': cell.otherMonth, today: cell.isToday }"
        @click="emit('day-click', cell.day)"
      >
        <div class="day-num">
          <span :class="{ 'today-marker': cell.isToday }">{{ cell.day.getDate() }}</span>
          <span v-if="cell.count > 0" class="day-count">{{ cell.count }}</span>
        </div>
        <div class="events ds-stack">
          <template v-for="it in cell.visible" :key="it.id">
            <AppointmentChip
              v-if="it.kind === 'appointment'"
              :appt="it.appt"
              variant="month"
              @click="emit('appointment-click', it.appt)"
            />
            <AgendaEventChip
              v-else
              :event="it.event"
              dense
              @click="emit('event-click', it.event)"
            />
          </template>
          <div v-if="cell.overflow > 0" class="more">+{{ cell.overflow }} más</div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* A11Y-09 · WCAG 2.2 §1.4.11. Las 42 celdas de esta reja son `<button>`: la reja
   NO es un separador decorativo, es la frontera entre 42 controles pulsables, y
   por tanto le aplica el mínimo de 3:1. Este marco exterior cierra la última
   columna y la última fila, que no tienen borde propio (`nth-child(7n)` lo
   quita), así que también es frontera de control: era `--warm-200` (1,23:1). */
.month {
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 12px;
  overflow: auto hidden;
  -webkit-overflow-scrolling: touch;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  background: var(--warm-100);

  /* Borde superior de la primera fila de celdas pulsables, no un separador. */
  border-bottom: 1px solid var(--warm-450);
}

.weekday {
  padding: 10px 12px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--warm-500);
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  min-width: 640px;
  grid-auto-rows: minmax(110px, auto);
}

/* El tono de reposo se declara aquí a (0,2,0) para ganarle a la forma plana
   de `.ds-tone--neutral-soft`; el hover lo pone su forma `:hover` (0,3,0), que
   sube el borde a `--warm-500`. Un estado de interacción no puede bajar el
   contraste del control, y dejarlo en `--warm-450` lo bajaba de 3,55:1 a
   3,35:1 al oscurecer el relleno. */
.cell {
  align-items: stretch;
  gap: var(--space-4);
  padding: 8px 8px 10px;
  background: var(--warm-50);
  border: none;

  /* A11Y-09 (issue #204): era `--warm-150`, 1,13:1 sobre el relleno de la celda
     y 1,06:1 sobre el de las celdas de otro mes y la de hoy. `--warm-450` da
     3,55:1 / 3,35:1 / 3,34:1 respectivamente. */
  border-right: 1px solid var(--warm-450);
  border-bottom: 1px solid var(--warm-450);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  min-height: 110px;
  transition: background 0.12s ease;
}

.cell:nth-child(7n) {
  border-right: none;
}

/* El `opacity: 0.55` que había aquí se retira, y no por estética: la opacidad
   se aplica al elemento entero, borde incluido, así que atenuaba la reja de
   estas celdas contra el fondo del calendario. Con ella puesta NINGÚN token la
   salva — medido sobre `--warm-50`, la reja se queda en 1,81:1 con
   `--warm-450`, 2,17:1 con `--warm-500` y 2,46:1 con `--warm-600`, todos por
   debajo del mínimo. El "mes vecino" se marca ahora con lo que ya lo marcaba
   —el relleno `--warm-100`— más el número de día atenuado por color, que sí
   deja el borde a contraste pleno. De paso, los chips de estas celdas dejan de
   renderizarse al 55% y recuperan su propio contraste de texto. */
.cell.other-month {
  background: var(--warm-100);
}

.cell.other-month .day-num {
  color: var(--warm-500);
}

.cell.today {
  background: var(--amatista-50);
}

.cell.today:hover {
  background: var(--amatista-100);
}

.day-num {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: var(--warm-700);
  margin-bottom: 2px;
}

.today-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--amatista-700);
  color: white;
  font-weight: 600;
}

.day-count {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  background: var(--amatista-100);
  color: var(--amatista-700);
  border-radius: 4px;
}

.events {
  gap: var(--space-3);
  min-width: 0;
}

.more {
  font-size: 11px;
  color: var(--warm-600);
  padding: 2px 4px;
  font-weight: 500;
}
</style>

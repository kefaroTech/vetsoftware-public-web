<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  addDays,
  formatDayLong,
  formatMonthLong,
  formatWeekRange,
  startOfWeek,
} from '../composables/dateUtils'

type ViewMode = 'month' | 'week' | 'day'

const props = defineProps<{
  view: ViewMode
  cursor: Date
}>()

const emit = defineEmits<{
  'update:view': [v: ViewMode]
  'update:cursor': [d: Date]
  'set-view': [v: ViewMode]
}>()

const cursorLabel = computed(() => {
  if (props.view === 'month') return formatMonthLong(props.cursor)
  if (props.view === 'week') return formatWeekRange(startOfWeek(props.cursor))
  return formatDayLong(props.cursor)
})

function today() {
  emit('update:cursor', new Date())
}

function step(direction: -1 | 1) {
  const d = props.cursor
  if (props.view === 'month') {
    emit('update:cursor', new Date(d.getFullYear(), d.getMonth() + direction, 1))
  } else if (props.view === 'week') {
    emit('update:cursor', addDays(d, direction * 7))
  } else {
    emit('update:cursor', addDays(d, direction))
  }
}

function selectView(v: ViewMode) {
  emit('update:view', v)
  emit('set-view', v)
}
</script>

<template>
  <div class="toolbar">
    <div class="left ds-flex-row">
      <button type="button" class="today-btn" @click="today">Hoy</button>
      <button
        type="button"
        class="arrow-btn ds-hover-neutral"
        aria-label="Anterior"
        @click="step(-1)"
      >
        <ChevronLeft :size="16" :stroke-width="1.8" />
      </button>
      <button
        type="button"
        class="arrow-btn ds-hover-neutral"
        aria-label="Siguiente"
        @click="step(1)"
      >
        <ChevronRight :size="16" :stroke-width="1.8" />
      </button>
      <div class="cursor-label">{{ cursorLabel }}</div>
    </div>
    <div class="right">
      <div class="view-toggle">
        <button
          type="button"
          class="view-btn"
          :class="{ active: view === 'month' }"
          @click="selectView('month')"
        >
          Mes
        </button>
        <button
          type="button"
          class="view-btn"
          :class="{ active: view === 'week' }"
          @click="selectView('week')"
        >
          Semana
        </button>
        <button
          type="button"
          class="view-btn"
          :class="{ active: view === 'day' }"
          @click="selectView('day')"
        >
          Día
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Mobile-first a propósito: la barra apila en columna por defecto y sólo pasa a
   fila centrada a partir de 760px. Antes era al revés (fila centrada en la base y
   `align-items: stretch; flex-direction: column` dentro de la media query) — ese
   par tenía que DESHACER el `align-items: center` de la base y por eso se repetía
   idéntico en cuatro componentes. Invertir la consulta lo elimina en origen: la
   base ya no fija `align-items`, así que el móvil hereda el valor inicial. */
.toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  margin-top: 16px;
}

@media (width > 760px) {
  .toolbar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
}

.today-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  color: var(--warm-800);
  border-radius: 8px;
  cursor: pointer;
}

.today-btn:hover {
  background: var(--warm-100);
}

.arrow-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--warm-450);
  background: var(--warm-50);
  color: var(--warm-600);
  display: grid;
  place-items: center;
  cursor: pointer;
}

/* El hover neutro (warm-100 + warm-900) lo pone `.ds-hover-neutral`, que gana a
   esta base por especificidad (0,3,0 frente a 0,2,0). */

.cursor-label {
  margin-left: 8px;
  font-family: var(--font-display);
  font-size: 20px;
  text-transform: capitalize;
  color: var(--warm-900);
  letter-spacing: -0.01em;
}

/* A11Y-09 · mismo defecto que el conmutador de sujeto de la cita (issue #208),
   aquí en el selector Mes/Semana/Día. Además le faltaba la frontera del grupo
   entero: la pista `--warm-150` mide 1,12:1 contra la página, así que ni el
   conjunto se leía como control. `--warm-450` da 3,54:1. */
.view-toggle {
  display: inline-flex;
  background: var(--warm-150);
  border: 1px solid var(--warm-450);
  border-radius: 9px;
  padding: 3px;
  gap: 2px;
}

/* Borde transparente: reserva el sitio del que marca el segmento elegido. */
.view-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--warm-700);
  border-radius: 7px;
  cursor: pointer;
}

/* El segmento elegido se marcaba con relleno `--warm-50` sobre `--warm-150`:
   1,12:1. `--amatista-500` da 4,44:1 contra su relleno y 3,95:1 contra la
   pista. */
.view-btn.active {
  background: var(--warm-50);
  color: var(--warm-900);
  border-color: var(--amatista-500);
  box-shadow: var(--shadow-xs);
}

@media (width <= 760px) {
  .left {
    flex-wrap: wrap;
  }

  .cursor-label {
    flex: 1 1 90px;
    margin-left: 0;
    text-align: center;
  }

  .right,
  .view-toggle {
    width: 100%;
  }

  .view-btn {
    flex: 1;
    padding: 6px 8px;
  }
}
</style>

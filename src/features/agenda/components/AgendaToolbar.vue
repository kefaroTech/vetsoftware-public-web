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
    <div class="left">
      <button type="button" class="today-btn" @click="today">Hoy</button>
      <button type="button" class="arrow-btn" aria-label="Anterior" @click="step(-1)">
        <ChevronLeft :size="16" :stroke-width="1.8" />
      </button>
      <button type="button" class="arrow-btn" aria-label="Siguiente" @click="step(1)">
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
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  margin-top: 16px;
}

.left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.today-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border: 1px solid var(--warm-200);
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
  border: 1px solid var(--warm-200);
  background: var(--warm-50);
  color: var(--warm-600);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.arrow-btn:hover {
  background: var(--warm-100);
  color: var(--warm-900);
}

.cursor-label {
  margin-left: 8px;
  font-family: var(--font-serif);
  font-size: 20px;
  text-transform: capitalize;
  color: var(--warm-900);
  letter-spacing: -0.01em;
}

.view-toggle {
  display: inline-flex;
  background: var(--warm-150);
  border-radius: 9px;
  padding: 3px;
  gap: 2px;
}

.view-btn {
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: var(--warm-700);
  border-radius: 7px;
  cursor: pointer;
}

.view-btn.active {
  background: var(--warm-50);
  color: var(--warm-900);
  box-shadow: 0 1px 2px rgb(20 15 30 / 8%);
}

@media (width <= 760px) {
  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

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

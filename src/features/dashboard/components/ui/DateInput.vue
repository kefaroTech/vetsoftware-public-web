<script setup lang="ts">
import { computed } from 'vue'
import { Calendar } from 'lucide-vue-next'
import DatePicker from 'vue-datepicker-next'
import 'vue-datepicker-next/index.css'

const props = defineProps<{
  modelValue?: string | null
  id?: string
  placeholder?: string
  min?: string
  max?: string
  invalid?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

// Locale español embebido (evita depender de que la librería envíe el locale es).
// firstDayOfWeek: 1 → la semana empieza en lunes.
const lang = {
  formatLocale: {
    months: [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ],
    monthsShort: [
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sep',
      'oct',
      'nov',
      'dic',
    ],
    weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    weekdaysShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    weekdaysMin: ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'],
    firstDayOfWeek: 1,
    firstWeekContainsDate: 4,
  },
  monthBeforeYear: true,
}

// Comparación por número yyyymmdd (1-based) para respetar min/max sin líos de zona horaria.
const minNum = computed(() => (props.min ? Number(props.min.replaceAll('-', '')) : null))
const maxNum = computed(() => (props.max ? Number(props.max.replaceAll('-', '')) : null))

function disabledDate(date: Date): boolean {
  const n = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  if (minNum.value !== null && n < minNum.value) return true
  if (maxNum.value !== null && n > maxNum.value) return true
  return false
}

const inputAttr = computed(() => ({
  id: props.id,
  ...(props.invalid ? { 'aria-invalid': 'true' } : {}),
}))

function onUpdate(value: string | null) {
  emit('update:modelValue', value ?? '')
}
</script>

<template>
  <div class="date-wrap" :class="{ invalid, disabled }">
    <DatePicker
      :value="modelValue || null"
      value-type="YYYY-MM-DD"
      format="DD MMM YYYY"
      :lang="lang"
      :editable="false"
      :clearable="false"
      :append-to-body="true"
      :disabled="disabled"
      :disabled-date="disabledDate"
      :input-attr="inputAttr"
      :placeholder="placeholder ?? 'Seleccionar fecha'"
      @update:value="onUpdate"
      @close="emit('blur')"
    >
      <template #icon-calendar>
        <Calendar :size="14" :stroke-width="1.6" class="dp-icon" />
      </template>
    </DatePicker>
  </div>
</template>

<style scoped>
.date-wrap {
  width: 100%;
}

.date-wrap.invalid {
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.date-wrap.disabled {
  opacity: 0.6;
}

@keyframes shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-3px);
  }
  40%,
  60% {
    transform: translateX(3px);
  }
}
</style>

<style>
/* ------------------------------------------------------------------ */

/* Tema amatista para vue-datepicker-next. El input vive en el árbol   */

/* del componente; el panel se teletransporta a <body> (append-to-body) */

/* → estos overrides son globales, acotados por .date-wrap / .mx-*.    */

/* ------------------------------------------------------------------ */

/* --- Input (trigger) --- */
.date-wrap .mx-datepicker {
  width: 100%;
}

.date-wrap .mx-input {
  height: auto;
  box-sizing: border-box;
  padding: 10px 14px 10px 38px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--warm-900);
  box-shadow: none;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.date-wrap .mx-input:hover {
  border-color: var(--warm-300);
}

.date-wrap .mx-input:focus {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}

.date-wrap .mx-input::placeholder {
  color: var(--warm-500);
}

.date-wrap .mx-icon-calendar {
  left: 12px;
  right: auto;
  color: var(--warm-500);
  font-size: inherit;
}

.date-wrap .dp-icon {
  display: block;
}

.date-wrap.invalid .mx-input {
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
}

.date-wrap.invalid .mx-input:focus {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: 0 0 0 3px oklch(92% 0.06 25deg);
}

.date-wrap.invalid .mx-icon-calendar {
  color: oklch(55% 0.22 25deg);
}

/* --- Panel (teletransportado a body) --- */
.mx-datepicker-main {
  z-index: 2100 !important;
  font-family: var(--font-sans);
  color: var(--warm-900);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  box-shadow: 0 14px 38px rgb(40 20 80 / 18%);
}

.mx-datepicker-main {
  width: auto;
}

.mx-datepicker-main .mx-calendar {
  width: 256px;
  box-sizing: border-box;
  padding: 8px 10px;
}

/* La tabla del calendario nunca debe forzar el ancho del panel. */
.mx-datepicker-main .mx-calendar-content,
.mx-datepicker-main .mx-table {
  width: 100%;
  min-width: 0;
}

.mx-datepicker-main .mx-calendar-header {
  height: auto;
  margin-bottom: 4px;
}

.mx-datepicker-main .mx-calendar-header-label {
  font-weight: 600;
  color: var(--warm-900);
}

.mx-datepicker-main .mx-btn {
  color: var(--warm-700);
}

.mx-datepicker-main .mx-btn:hover {
  color: var(--amatista-600);
  border-color: transparent;
}

.mx-datepicker-main .mx-calendar-content .mx-table th {
  color: var(--warm-500);
  font-weight: 500;
}

.mx-datepicker-main .mx-table-date .cell {
  color: var(--warm-800);
  border-radius: 8px;
}

.mx-datepicker-main .mx-table-date .cell:hover {
  background: var(--amatista-50);
  color: var(--amatista-700);
}

.mx-datepicker-main .mx-table-date .cell.active {
  background: var(--amatista-600);
  color: #fff;
}

.mx-datepicker-main .mx-table-date .cell.today {
  color: var(--amatista-600);
  font-weight: 600;
}

.mx-datepicker-main .mx-table-date .cell.not-current-month {
  color: var(--warm-300);
}

.mx-datepicker-main .mx-table-date .cell.disabled {
  color: var(--warm-200);
  background: transparent;
  cursor: not-allowed;
}
</style>

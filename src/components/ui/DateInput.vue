<script setup lang="ts">
import { computed, inject } from 'vue'
import { FieldKey } from './fieldContext'
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
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const field = inject(FieldKey, null)

/**
 * A11Y-04 · FORM-01 · FORM-04 — el id se toma del `BaseField` que envuelve al
 * campo cuando el consumidor no lo pasa. Es lo que arregla, sin tocarlos, a los
 * consumidores que abren `BaseField` y olvidan el `:id` del slot: hasta aquí su
 * `<label for>` apuntaba a un elemento inexistente.
 */
const controlId = computed(() => props.id ?? field?.controlId)
const describedBy = computed(() => field?.describedBy.value)
const isRequired = computed(() => field?.required.value ?? false)

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

/**
 * La librería pinta su propio <input>: este objeto es lo único que llega hasta
 * él, así que todo el cableado de accesibilidad viaja aquí.
 *
 * Y es también la puerta del estado de SOLO LECTURA. Verificado en la fuente
 * (`node_modules/vue-datepicker-next/index.es.js:584-592`): el input se
 * construye con `__spreadValues({ class, readonly, disabled, placeholder },
 * props.inputAttr)`, un merge de objeto plano en el que `inputAttr` va DESPUÉS
 * — así que sobrescribe el `readonly: !props.editable` de la librería sin
 * tocar `editable`, que se queda en `true`.
 *
 * Solo el `readonly` nativo, sin `aria-readonly`: el elemento es un `<input>`
 * de verdad y `docs/ux/estado-solo-lectura.md` §5.2 prohíbe ponerle los dos.
 */
const inputAttr = computed(() => ({
  id: controlId.value,
  ...(props.invalid ? { 'aria-invalid': 'true' } : {}),
  ...(isRequired.value ? { 'aria-required': 'true' } : {}),
  ...(describedBy.value ? { 'aria-describedby': describedBy.value } : {}),
  ...(props.readonly ? { readonly: true } : {}),
}))

/**
 * NOTA sobre el solo lectura: NO se implementa con `editable`. Además de la
 * regresión de teclado de abajo, `:editable="false"` nunca habría bloqueado el
 * campo: `index.es.js:800-801` abre el calendario con `onClick` Y con
 * `onFocus`, así que la fecha seguiría cambiándose con el ratón. Se hace con
 * `readonly` por `input-attr` más `:open` clavado en `false`.
 *
 * `editable` está en `true` a propósito (A11Y-02): con `false` la librería pinta
 * el input en `readonly` y la fecha queda inalcanzable con teclado en los ~54
 * consumidores de este componente — WCAG 2.2 §2.1.1.
 *
 * NO hace falta validar aquí el formato tecleado: `PickerInput.handleChange` de
 * `vue-datepicker-next` ya parsea el texto con el `format` declarado arriba
 * (`DD MMM YYYY`, con el `lang` español de este fichero), y solo llama a
 * `onChange` si `isValidValue(date) && !isDisabledValue(date)` — es decir, si
 * parsea Y además pasa `disabled-date`, que es donde viven `min`/`max`. Un texto
 * que no case («2026-08-20», «20/08/2026», «tururu») no emite nada: la librería
 * descarta el borrador y el input revierte al valor formateado. Así que este
 * `emit` sigue recibiendo únicamente `YYYY-MM-DD` válido o `null`, y el contrato
 * del `v-model` no cambia.
 */
function onUpdate(value: string | null) {
  emit('update:modelValue', value ?? '')
}
</script>

<template>
  <div
    class="date-wrap"
    :class="{
      invalid,
      disabled,
      readonly,
      'ds-field-shake': invalid,
      'ds-is-disabled--60': disabled,
    }"
  >
    <DatePicker
      :value="modelValue || null"
      value-type="YYYY-MM-DD"
      format="DD MMM YYYY"
      :lang="lang"
      :editable="true"
      :open="readonly ? false : undefined"
      :clearable="false"
      :append-to-body="true"
      :disabled="disabled"
      :disabled-date="disabledDate"
      :input-attr="inputAttr"
      :placeholder="readonly ? undefined : (placeholder ?? 'dd mmm aaaa')"
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
/* El temblor de `invalid` es `.ds-field-shake` y el apagado de `disabled` es
   `.ds-is-disabled--60`, los dos desde el template. `.invalid`/`.disabled`
   siguen en el marcado porque los usa el bloque global de abajo para teñir
   `.mx-input`, que es un nodo de la librería. */
.date-wrap {
  width: 100%;
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

  /* A11Y-09 · WCAG 2.2 §1.4.11 (AA): --warm-200 medía 1,23:1 sobre --warm-50.
     --warm-450 da 3,55:1. Es un borde de control, no un separador. */
  border: 1px solid var(--warm-450);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--warm-900);
  box-shadow: none;

  /* `text` y no `pointer`: desde A11Y-02 el input es escribible (`editable`),
     y un cursor de mano sobre un campo que acepta tecleo miente. */
  cursor: text;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

/* --warm-500 (5,36:1): con el reposo en --warm-450, --warm-300 (1,49:1) dejaba
   el hover más claro que el reposo. */
.date-wrap .mx-input:hover {
  border-color: var(--warm-500);
}

/* Solo lectura. Va con (0,3,0) —clase del envoltorio más descendiente— y no con
   la primitiva `.ds-field-readonly` (0,1,0), que `.date-wrap .mx-input` (0,2,0)
   se comería: es el mismo motivo y el mismo patrón con el que este fichero ya
   resuelve `invalid`. Y va colocada DESPUÉS del hover y ANTES del foco a
   propósito: mismo peso los tres, así que el orden es el desempate — el hover no
   debe reactivar el borde de un campo que no se edita, y el anillo de foco sí
   debe verse, porque un campo de solo lectura sigue siendo enfocable. */
.date-wrap.readonly .mx-input {
  border-color: var(--warm-450);
  background: var(--surface-sunken);
  cursor: default;
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- `.mx-input` lo renderiza `vue-datepicker-next` dentro de su propio árbol: no hay marcado nuestro donde colgarle `.ds-focus-ring`, y el único gancho de la librería (`input-class`) reemplaza la clase `mx-input` en vez de añadirse, lo que tumbaría sus estilos base. */
.date-wrap .mx-input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
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

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- mismo motivo que el `:focus` neutro: `.ds-field-invalid-focus` habría que colgarla de `.mx-input`, un nodo de `vue-datepicker-next` que no pasa por nuestro marcado. El estado inválido vive en el wrapper `.date-wrap`, y una clase en el wrapper no tiñe el input de dentro. */
.date-wrap.invalid .mx-input:focus {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: var(--ring-danger);
}

.date-wrap.invalid .mx-icon-calendar {
  color: oklch(55% 0.22 25deg);
}

/* --- Panel (teletransportado a body) --- */
.mx-datepicker-main {
  /* El `!important` sobra: la única regla de la librería con z-index es
     `.mx-datepicker-popup` (2001), pesa lo mismo (0,1,0) y nuestra hoja carga
     después. */
  z-index: var(--z-popover);
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

/* Días del mes anterior/siguiente. SON ELEGIBLES —pulsarlos salta a esa fecha,
   que es lo que se espera al elegir un día cercano al cambio de mes—, así que
   son contenido operable y WCAG 2.2 §1.4.3 (AA) les exige 4,5:1 completos.
   --warm-300 medía 1,53:1 sobre el blanco del panel (que lo pinta la librería,
   no nosotros) y no se veían. --warm-500 da 5,52:1 y conserva la jerarquía: el
   día del mes en curso es --warm-800 (16,03:1), así que estos siguen leyéndose
   como secundarios sin bajar del mínimo legal. Ojo: --warm-450, el escalón de
   A11Y-09, NO sirve aquí (3,65:1) — ese es el umbral de 3:1 de borde, no el de
   4,5:1 de texto.

   Y va AQUÍ, pegada a la regla base y ANTES de :hover, .active y .today: las
   cuatro pesan (0,4,0), así que la posición es el único desempate. Desde la
   posición anterior —la última— este color le ganaba a .active, y con un token
   oscuro eso habría dejado el día seleccionado de otro mes en 1,19:1 sobre
   --amatista-600, ilegible. Cediendo el paso, .active recupera su blanco
   (6,55:1) y :hover su amatista (8,36:1). Los tres dicen algo más específico
   que «pertenece a otro mes» y deben ganarle. */
.mx-datepicker-main .mx-table-date .cell.not-current-month {
  color: var(--warm-500);
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- las celdas del calendario las genera `vue-datepicker-next` en un panel teletransportado a `<body>`; no hay slot por celda al que añadir `.ds-tone--accent-soft`, y la primitiva es plana: teñiría también el reposo, no sólo el `:hover`. */
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

.mx-datepicker-main .mx-table-date .cell.disabled {
  color: var(--warm-200);
  background: transparent;
  cursor: not-allowed;
}
</style>

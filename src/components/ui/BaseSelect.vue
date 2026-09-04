<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { FieldKey } from './fieldContext'
import { Check, ChevronDown } from 'lucide-vue-next'

interface Option {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    placeholder?: string
    options: Option[]
    id?: string
    disabled?: boolean
    invalid?: boolean
    readonly?: boolean
  }>(),
  { placeholder: 'Selecciona una opción' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const field = inject(FieldKey, null)

const uid = useId()

/**
 * A11Y-04 · FORM-01 · FORM-04 — el id, la descripción y la obligatoriedad se
 * toman del `BaseField` que envuelve al campo cuando el consumidor no los pasa.
 * La prop explícita va primero: fuera de un `BaseField` el componente sigue
 * comportándose igual que antes.
 */
const controlId = computed(() => props.id ?? field?.controlId ?? uid)
const describedBy = computed(() => field?.describedBy.value)
const isRequired = computed(() => field?.required.value ?? false)

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const open = ref(false)
const highlighted = ref(-1)
const panelStyle = ref<Record<string, string>>({})

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))

/**
 * Tono del disparador: los tres estados son EXCLUYENTES y viajan como clase
 * desde el marcado. La regla base `.trigger` se queda con la geometría para que
 * no compita con `.ds-field-invalid` / `.ds-field-disabled`, que pesan (0,1,0)
 * y perderían contra cualquier `.select.estado .trigger` scoped. El anillo de
 * foco y el de foco-inválido siguen siendo reglas scoped propias porque el
 * disparador usa `:focus-visible` (y el estado `open`), que las primitivas
 * `.ds-focus-ring*` no distinguen.
 */
const toneClass = computed(() => {
  if (props.invalid) return ['tone-text', 'ds-field-invalid']
  if (props.disabled) return ['tone-border', 'ds-field-disabled']
  // Solo lectura NO es deshabilitado: el disparador conserva el foco —es la
  // única forma de que un lector lea el valor— y el v-model sigue viajando. Lo
  // único que se apaga es abrir el panel. Sin `tone-*`: los tres los trae
  // `.ds-field-readonly`.
  if (props.readonly) return ['ds-field-readonly']
  return ['tone-border', 'tone-bg', 'tone-text']
})

function updatePosition() {
  const t = trigger.value
  if (!t) return
  const r = t.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom
  const spaceAbove = r.top
  const openUp = spaceBelow < 260 && spaceAbove > spaceBelow
  panelStyle.value = {
    position: 'fixed',
    left: `${Math.round(r.left)}px`,
    width: `${Math.round(r.width)}px`,
    maxHeight: `${Math.max(160, Math.round((openUp ? spaceAbove : spaceBelow) - 12))}px`,
    ...(openUp
      ? { bottom: `${Math.round(window.innerHeight - r.top + 4)}px` }
      : { top: `${Math.round(r.bottom + 4)}px` }),
  }
}

function onScrollResize() {
  if (open.value) updatePosition()
}

function openPanel() {
  if (props.disabled || props.readonly || open.value) return
  open.value = true
  highlighted.value = selectedIndex.value >= 0 ? selectedIndex.value : 0
  updatePosition()
  window.addEventListener('scroll', onScrollResize, true)
  window.addEventListener('resize', onScrollResize)
  nextTick(scrollHighlightedIntoView)
}

function close(refocus = false) {
  if (!open.value) return
  open.value = false
  window.removeEventListener('scroll', onScrollResize, true)
  window.removeEventListener('resize', onScrollResize)
  if (refocus) trigger.value?.focus()
}

function toggle() {
  open.value ? close(true) : openPanel()
}

function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close()
  emit('blur')
}

function scrollHighlightedIntoView() {
  panel.value
    ?.querySelector<HTMLElement>(`[data-idx="${highlighted.value}"]`)
    ?.scrollIntoView({ block: 'nearest' })
}

function move(delta: number) {
  const n = props.options.length
  if (n === 0) return
  highlighted.value = (highlighted.value + delta + n) % n
  nextTick(scrollHighlightedIntoView)
}

// Typeahead: salta a la opción cuya etiqueta empieza por lo tecleado.
let typeahead = ''
let typeaheadTimer: ReturnType<typeof setTimeout> | null = null
function onType(char: string) {
  typeahead += char.toLowerCase()
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
  typeaheadTimer = setTimeout(() => (typeahead = ''), 600)
  const idx = props.options.findIndex((o) => o.label.toLowerCase().startsWith(typeahead))
  if (idx >= 0) {
    highlighted.value = idx
    nextTick(scrollHighlightedIntoView)
  }
}

function onKeydown(e: KeyboardEvent) {
  // `<select>` no tiene `readonly` nativo: aquí se reproduce cerrando las dos
  // vías que cambian el valor —abrir el panel y las teclas— sin tocar el
  // `tabindex`, para que el control siga siendo enfocable y anunciable.
  if (props.disabled || props.readonly) return
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      open.value ? move(1) : openPanel()
      break
    case 'ArrowUp':
      e.preventDefault()
      open.value ? move(-1) : openPanel()
      break
    case 'Home':
      if (open.value) {
        e.preventDefault()
        highlighted.value = 0
        nextTick(scrollHighlightedIntoView)
      }
      break
    case 'End':
      if (open.value) {
        e.preventDefault()
        highlighted.value = props.options.length - 1
        nextTick(scrollHighlightedIntoView)
      }
      break
    case 'Enter':
    case ' ':
      e.preventDefault()
      if (!open.value) openPanel()
      else {
        const highlightedOption = props.options[highlighted.value]
        if (highlightedOption) pick(highlightedOption)
      }
      break
    case 'Escape':
      if (open.value) {
        e.preventDefault()
        close(true)
        emit('blur')
      }
      break
    case 'Tab':
      if (open.value) {
        close()
        emit('blur')
      }
      break
    default:
      if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (!open.value) openPanel()
        onType(e.key)
      }
  }
}

function onDocMouseDown(e: MouseEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (root.value?.contains(t) || panel.value?.contains(t)) return
  close()
  emit('blur')
}

// Si las opciones cambian y la resaltada queda fuera de rango, reajusta.
watch(
  () => props.options.length,
  (n) => {
    if (highlighted.value >= n) highlighted.value = n - 1
  },
)

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown)
  window.removeEventListener('scroll', onScrollResize, true)
  window.removeEventListener('resize', onScrollResize)
  if (typeaheadTimer) clearTimeout(typeaheadTimer)
})
</script>

<template>
  <div ref="root" class="select" :class="{ disabled, invalid, open, readonly }">
    <button
      :id="controlId"
      ref="trigger"
      type="button"
      class="trigger ds-flex-row"
      :class="toneClass"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-invalid="invalid || undefined"
      :aria-readonly="readonly || undefined"
      :aria-required="isRequired || undefined"
      :aria-describedby="describedBy"
      :aria-activedescendant="
        open && highlighted >= 0 ? `${controlId}-opt-${highlighted}` : undefined
      "
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span :class="['value', 'ds-flex-fill', 'ds-truncate', { placeholder: !selected }]">{{
        selected?.label ?? placeholder
      }}</span>
      <ChevronDown :size="13" :stroke-width="1.8" class="chev ds-icon-muted" />
    </button>

    <Teleport to="body">
      <ul v-if="open" ref="panel" class="panel ds-list-reset" role="listbox" :style="panelStyle">
        <li v-if="options.length === 0" class="empty">Sin opciones</li>
        <li
          v-for="(o, i) in options"
          :id="`${controlId}-opt-${i}`"
          :key="o.value"
          class="item"
          :class="{
            active: i === highlighted,
            'ds-tone--accent-soft': i === highlighted,
            selected: o.value === modelValue,
          }"
          role="option"
          :aria-selected="o.value === modelValue"
          :data-idx="i"
          @mousedown.prevent="pick(o)"
          @mousemove="highlighted = i"
        >
          <span class="ds-flex-fill ds-truncate">{{ o.label }}</span>
          <Check v-if="o.value === modelValue" :size="14" :stroke-width="2.4" class="item-check" />
        </li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  font-family: var(--font-sans);
}

/* La base se queda con la GEOMETRÍA: ni `background`, ni `border-color`, ni
   `color`. Scoped pesa (0,2,0) y le ganaría a las primitivas `.ds-field-*`
   (0,1,0). El color viaja en las clases de tono, excluyentes entre sí. */
.trigger {
  width: 100%;
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

/* El cursor por defecto excluye el deshabilitado en vez de competir con el
   `cursor: not-allowed` que trae `.ds-field-disabled`. */
.trigger:not(:disabled, .ds-field-readonly) {
  cursor: pointer;
}

/* Tono en reposo, en tres piezas porque cada estado sustituye un subconjunto
   distinto: deshabilitado cambia fondo y texto pero conserva el borde neutro;
   inválido cambia fondo y borde pero conserva el texto. Mantienen el peso
   (0,2,0) y la posición que tenía el trío dentro de `.trigger`, así que su
   resolución frente a `.trigger:focus-visible` (más abajo) no cambia. */

/* A11Y-09 · WCAG 2.2 §1.4.11 (AA): --warm-200 medía 1,23:1 sobre --warm-50 y
   el límite del campo era invisible con poca luz. --warm-450 da 3,54:1. Es el
   escalón que tokens.css reserva para bordes de control e icono; --warm-200 se
   queda para separadores y divisores, que §1.4.11 exime por decorativos. */
.tone-border {
  border-color: var(--warm-450);
}

.tone-bg {
  background: var(--warm-50);
}

.tone-text {
  color: var(--warm-900);
}

/* --warm-500 (5,38:1): con el reposo en --warm-450, --warm-300 (1,48:1) dejaba
   el hover más claro que el reposo. */
.select:not(.open, .disabled, .readonly, .invalid) .trigger:hover {
  border-color: var(--warm-500);
}

.select.open .trigger,
.trigger:focus-visible {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

/* stylelint-disable-next-line vetsoftware/no-duplicate-primitive -- `.ds-field-invalid-focus` pesa (0,1,0) y `.select.open .trigger` (0,3,0) le gana: el anillo de foco inválido tiene que reafirmarse aquí, a (0,3,0), para desempatar contra el estado `open`. Además la segunda mitad del selector es `:focus-visible`, un pseudo-estado que ninguna clase aplicada desde el marcado puede reproducir. */
.select.invalid.open .trigger,
.select.invalid .trigger:focus-visible {
  border-color: var(--danger-border);
  box-shadow: var(--ring-danger);
}

.select.invalid .chev {
  color: var(--danger-border);
}

.value {
  text-align: left;
}

.value.placeholder {
  color: var(--warm-400);
}

.chev {
  pointer-events: none;
  transition:
    transform 0.18s ease,
    color 0.15s ease;
}

.select.open .chev {
  transform: rotate(180deg);
  color: var(--amatista-500);
}
</style>

<style>
/* El panel se teletransporta a <body>: estilos globales acotados por la clase. */
.panel[role='listbox'] {
  z-index: var(--z-popover);
  padding: 5px;
  overflow-y: auto;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 11px;
  box-shadow: 0 14px 38px rgb(40 20 80 / 18%);
  font-family: var(--font-sans);
  animation: bsel-pop 0.13s ease;
}

@keyframes bsel-pop {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel[role='listbox'] .item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 11px;
  border-radius: 8px;
  font-size: 13.5px;
  cursor: pointer;
}

/* El color de reposo se declara excluyendo los dos estados que lo sustituyen
   (`.active` lo pone `.ds-tone--accent-soft` desde el marcado; `.selected`, la
   regla de abajo). Si viviera en la regla base pesaría (0,2,1) y la primitiva,
   que pesa (0,1,0), no podría teñir la opción resaltada. */
.panel[role='listbox'] .item:not(.active, .selected) {
  color: var(--warm-800);
}

.panel[role='listbox'] .item + .item {
  margin-top: 2px;
}

.panel[role='listbox'] .item .item-check {
  flex-shrink: 0;
  color: var(--amatista-600);
}

.panel[role='listbox'] .item.selected {
  font-weight: 600;
  color: var(--amatista-700);
}

.panel[role='listbox'] .empty {
  padding: 12px 11px;
  font-size: 12.5px;
  color: var(--warm-400);
  text-align: center;
}
</style>

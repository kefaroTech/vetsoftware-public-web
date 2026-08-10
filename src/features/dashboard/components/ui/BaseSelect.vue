<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
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
  }>(),
  { placeholder: 'Selecciona una opción' },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const uid = useId()
const controlId = computed(() => props.id ?? uid)

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const open = ref(false)
const highlighted = ref(-1)
const panelStyle = ref<Record<string, string>>({})

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))
const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))

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
  if (props.disabled || open.value) return
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
  if (props.disabled) return
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
      else if (props.options[highlighted.value]) pick(props.options[highlighted.value])
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
  <div ref="root" class="select" :class="{ disabled, invalid, open }">
    <button
      :id="controlId"
      ref="trigger"
      type="button"
      class="trigger"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-invalid="invalid || undefined"
      :aria-activedescendant="
        open && highlighted >= 0 ? `${controlId}-opt-${highlighted}` : undefined
      "
      :disabled="disabled"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span :class="['value', { placeholder: !selected }]">{{
        selected?.label ?? placeholder
      }}</span>
      <ChevronDown :size="13" :stroke-width="1.8" class="chev" />
    </button>

    <Teleport to="body">
      <ul v-if="open" ref="panel" class="panel" role="listbox" :style="panelStyle">
        <li v-if="options.length === 0" class="empty">Sin opciones</li>
        <li
          v-for="(o, i) in options"
          :id="`${controlId}-opt-${i}`"
          :key="o.value"
          class="item"
          :class="{ active: i === highlighted, selected: o.value === modelValue }"
          role="option"
          :aria-selected="o.value === modelValue"
          :data-idx="i"
          @mousedown.prevent="pick(o)"
          @mousemove="highlighted = i"
        >
          <span class="item-label">{{ o.label }}</span>
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

.trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.select:not(.open, .disabled, .invalid) .trigger:hover {
  border-color: var(--warm-300);
}

.select.open .trigger,
.trigger:focus-visible {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}

.select.disabled .trigger {
  background: var(--warm-100);
  color: var(--warm-500);
  cursor: not-allowed;
}

.select.invalid .trigger {
  border-color: oklch(60% 0.2 25deg);
  background: oklch(98.5% 0.02 25deg);
  animation: shake 0.32s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}

.select.invalid.open .trigger,
.select.invalid .trigger:focus-visible {
  border-color: oklch(55% 0.22 25deg);
  box-shadow: 0 0 0 3px var(--danger-200);
}

.select.invalid .chev {
  color: oklch(55% 0.22 25deg);
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

.value {
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.value.placeholder {
  color: var(--warm-400);
}

.chev {
  flex-shrink: 0;
  color: var(--warm-500);
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
  z-index: 2100;
  margin: 0;
  padding: 5px;
  list-style: none;
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
  color: var(--warm-800);
  cursor: pointer;
}

.panel[role='listbox'] .item + .item {
  margin-top: 2px;
}

.panel[role='listbox'] .item .item-label {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel[role='listbox'] .item .item-check {
  flex-shrink: 0;
  color: var(--amatista-600);
}

.panel[role='listbox'] .item.active {
  background: var(--amatista-50);
  color: var(--amatista-700);
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

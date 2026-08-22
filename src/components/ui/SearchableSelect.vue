<script setup lang="ts">
import { computed, inject, nextTick, ref } from 'vue'
import { ChevronDown, Plus, Search } from 'lucide-vue-next'
import { useAnchoredPanel } from '@/composables/useAnchoredPanel'
import { FieldKey } from './fieldContext'

interface Option {
  value: string
  label: string
  hint?: string
}

type CreateResult = Option | undefined

const props = withDefaults(
  defineProps<{
    modelValue?: string | null
    options: Option[]
    id?: string
    placeholder?: string
    disabled?: boolean
    loading?: boolean
    invalid?: boolean
    onCreate?: (opt: { name: string; description: string }) => CreateResult | Promise<CreateResult>
    createLabel?: string
  }>(),
  {
    // El control TIENE buscador y el texto por defecto no lo decía: se escribe
    // para filtrar, no solo se elige de una lista.
    placeholder: 'Busca o selecciona',
    createLabel: 'Crear nuevo',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: []
}>()

const field = inject(FieldKey, null)

/**
 * A11Y-04 · FORM-01 · FORM-04 — el disparador no tenía id de ningún tipo, así
 * que el `<label for>` de `BaseField` nunca resolvió contra este control. La
 * prop explícita va primero para que siga funcionando fuera de `BaseField`.
 */
const controlId = computed(() => props.id ?? field?.controlId)
const describedBy = computed(() => field?.describedBy.value)
const isRequired = computed(() => field?.required.value ?? false)

const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const newNameInput = ref<HTMLInputElement | null>(null)

const open = ref(false)

// Posición anclada al disparador, clic fuera (el panel viaja a <body>, así que
// no basta con `root`) y retorno del foco de A11Y-03. `close` está declarada
// más abajo como `function`: hoisting.
const {
  style: panelStyle,
  reposition,
  focusTrigger,
} = useAnchoredPanel(open, { root, trigger, panel }, () => {
  close()
  emit('blur')
})

const q = ref('')
const creating = ref(false)
const newName = ref('')
const newHint = ref('')
const submitting = ref(false)
const createError = ref<string | null>(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue))

const filtered = computed(() => {
  if (!q.value.trim()) return props.options
  const needle = q.value.trim().toLowerCase()
  return props.options.filter((o) => `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(needle))
})

const showCreate = computed(() => !!props.onCreate && !creating.value)

// Tono del disparador: los tres estados son EXCLUYENTES y viajan como clase
// desde el marcado, para que ninguna regla scoped compita con las primitivas
// `.ds-field-*` (0,1,0). Ver el bloque <style>.
const toneClass = computed(() => {
  if (props.invalid) return ['tone-text', 'ds-field-invalid']
  if (props.disabled) return ['tone-border', 'ds-field-disabled']
  return ['tone-border', 'tone-bg', 'tone-text']
})

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}

function openPanel() {
  if (props.disabled) return
  open.value = true
  nextTick(() => searchInput.value?.focus())
}

function close() {
  open.value = false
  creating.value = false
  q.value = ''
  newName.value = ''
  newHint.value = ''
  createError.value = null
}

function pick(opt: Option) {
  emit('update:modelValue', opt.value)
  close()
  // El disparador es el elemento que representa el valor recién elegido.
  focusTrigger()
  emit('blur')
}

/** Escape: cierra y devuelve el foco al disparador (no solo cierra). */
function closeToTrigger() {
  close()
  focusTrigger()
  emit('blur')
}

function startCreate() {
  newName.value = q.value.trim()
  newHint.value = ''
  createError.value = null
  creating.value = true
  nextTick(() => {
    newNameInput.value?.focus()
    reposition()
  })
}

async function confirmCreate() {
  const name = newName.value.trim()
  if (!name || submitting.value) return
  submitting.value = true
  createError.value = null
  try {
    const created = await props.onCreate?.({
      name,
      description: newHint.value.trim(),
    })
    // Si `onCreate` no retorna `value`, el consumidor se encarga de
    // re-seleccionar tras su propio refresco.
    if (created && typeof created === 'object' && 'value' in created) {
      emit('update:modelValue', created.value)
    }
    close()
    emit('blur')
  } catch {
    createError.value = 'No se pudo crear. Intenta de nuevo.'
  } finally {
    submitting.value = false
  }
}

function cancelCreate() {
  creating.value = false
  newName.value = ''
  newHint.value = ''
  createError.value = null
  nextTick(() => {
    searchInput.value?.focus()
    reposition()
  })
}
</script>

<template>
  <div ref="root" class="ss" :class="{ disabled, invalid, open }">
    <button
      :id="controlId"
      ref="trigger"
      type="button"
      class="trigger ds-flex-row"
      :class="toneClass"
      :disabled="disabled"
      :aria-expanded="open"
      :aria-invalid="invalid || undefined"
      :aria-required="isRequired || undefined"
      :aria-describedby="describedBy"
      @click="toggle"
    >
      <span :class="['value', 'ds-truncate', { placeholder: !selected }]">
        {{ loading ? 'Cargando…' : (selected?.label ?? placeholder) }}
      </span>
      <ChevronDown :size="13" :stroke-width="1.8" class="ds-icon-muted" />
    </button>

    <Teleport to="body">
      <div v-if="open" ref="panel" class="panel ds-stack" :style="panelStyle">
        <template v-if="!creating">
          <div class="search-wrap">
            <Search :size="13" :stroke-width="1.7" class="search-icon" />
            <input
              ref="searchInput"
              v-model="q"
              type="text"
              class="search-input"
              placeholder="Buscar…"
              @keydown.escape.prevent="closeToTrigger"
            />
          </div>
          <div class="list">
            <div v-if="filtered.length === 0" class="empty ds-empty">Sin coincidencias</div>
            <button
              v-for="o in filtered"
              :key="o.value"
              type="button"
              class="item ds-stack"
              :class="{ selected: o.value === modelValue }"
              @click="pick(o)"
            >
              <span class="ds-item-label">{{ o.label }}</span>
              <span v-if="o.hint" class="ds-hint">{{ o.hint }}</span>
            </button>
          </div>
          <button v-if="showCreate" type="button" class="create ds-flex-row" @click="startCreate">
            <Plus :size="13" :stroke-width="1.8" />
            <template v-if="q.trim()">
              <span
                >Crear <strong>"{{ q.trim() }}"</strong></span
              >
            </template>
            <template v-else>
              <span>{{ createLabel }}</span>
            </template>
          </button>
        </template>

        <div v-else class="form ds-stack ds-stack--8" @mousedown.stop>
          <div class="form-title">{{ createLabel }}</div>
          <input
            ref="newNameInput"
            v-model="newName"
            type="text"
            class="form-input"
            placeholder="Nombre"
            :disabled="submitting"
            @keydown.enter.prevent="confirmCreate"
            @keydown.escape.prevent="cancelCreate"
          />
          <input
            v-model="newHint"
            type="text"
            class="form-input"
            placeholder="Descripción (opcional)"
            :disabled="submitting"
            @keydown.enter.prevent="confirmCreate"
            @keydown.escape.prevent="cancelCreate"
          />
          <div v-if="createError" class="form-error">{{ createError }}</div>
          <div class="form-actions ds-actions">
            <button
              type="button"
              class="ds-btn ds-btn--sm ds-btn--ghost"
              :disabled="submitting"
              @click="cancelCreate"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--sm ds-btn--solid"
              :disabled="!newName.trim() || submitting"
              @click="confirmCreate"
            >
              {{ submitting ? 'Creando…' : 'Crear y seleccionar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.ss {
  position: relative;
  font-family: var(--font-sans);
}

/* La base se queda con la GEOMETRÍA: scoped pesa (0,2,0) y le ganaría a las
   primitivas `.ds-field-*` (0,1,0). El color viaja en las clases de tono. */
.trigger {
  width: 100%;
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13.5px;
  font-family: inherit;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

/* Excluye el deshabilitado en vez de competir con `.ds-field-disabled`. */
.trigger:not(:disabled) {
  cursor: pointer;
}

/* Tono en reposo en tres piezas: cada estado sustituye un subconjunto distinto
   (deshabilitado conserva el borde; inválido conserva el texto). Mantienen el
   peso y la posición del trío que declaraba `.trigger`. */

/* A11Y-09 · WCAG 2.2 §1.4.11 (AA): --warm-200 medía 1,23:1 sobre --warm-50 y
   el límite del campo era invisible con poca luz. --warm-450 da 3,55:1. Es el
   escalón que tokens.css reserva para bordes de control e icono; --warm-200 se
   queda para separadores y divisores, que §1.4.11 exime por decorativos. */
.tone-border {
  border-color: var(--warm-450);
}

.tone-bg {
  background: var(--warm-50);
}

.tone-text {
  color: var(--warm-800);
}

.ss.open .trigger,
.trigger:focus-visible {
  outline: none;
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--amatista-500) 18%, transparent);
}

/* `.ds-field-invalid` (0,1,0) no le gana al anillo amatista de arriba: el borde
   inválido se reafirma para los dos estados en que ese anillo aparece, igual
   que hacía la regla `.ss.invalid .trigger` retirada. */
.ss.invalid.open .trigger,
.ss.invalid .trigger:focus-visible {
  border-color: oklch(60% 0.2 25deg);
}

.ss.invalid.open .trigger {
  box-shadow: var(--ring-danger);
}

.value {
  flex: 1;
  text-align: left;
}

.value.placeholder {
  color: var(--warm-400);
}

/* Teletransportado a <body> y posicionado con estilo inline (position: fixed).
   z-index por encima del overlay del modal (1500/1600). */
.panel {
  box-sizing: border-box;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  box-shadow: 0 12px 32px rgb(40 20 80 / 14%);
  z-index: var(--z-popover);
  overflow: hidden;
}

.search-wrap {
  position: relative;
  border-bottom: 1px solid var(--warm-200);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--warm-500);
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 32px;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
}

.list {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
}

.empty {
  padding: 14px 12px;
  font-size: 12.5px;
}

.item {
  width: 100%;
  background: transparent;
  border: none;
  padding: 8px 10px;
  border-radius: 6px;
  gap: 2px;
  text-align: left;
  font-family: inherit;
  cursor: pointer;
}

.item:hover {
  background: var(--warm-100);
}

.item.selected {
  background: var(--amatista-100);
}

.create {
  border-top: 1px solid var(--warm-200);
  padding: 10px 14px;
  background: transparent;
  border-left: none;
  border-right: none;
  border-bottom: none;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--amatista-700);
  cursor: pointer;
  justify-content: flex-start;
  text-align: left;
}

.create:hover {
  background: var(--amatista-50);
}

.create strong {
  font-weight: 600;
}

.form {
  padding: 14px;
}

.form-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--warm-700);
  margin-bottom: 2px;
}

.form-input {
  background: var(--warm-100);

  /* A11Y-09: es un control, no un separador — mismo criterio que `.tone-border`. */
  border: 1px solid var(--warm-450);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--warm-900);
  outline: none;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.form-input:focus {
  border-color: var(--amatista-500);
  background: var(--warm-50);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--amatista-500) 18%, transparent);
}

.form-error {
  font-size: 12px;
  color: var(--danger-600);
}

.form-actions {
  margin-top: 4px;
}

/* Los botones de creación inline usan `.ds-btn` (primitives.css); el estado
   deshabilitado ya lo cubre `.ds-btn:disabled` con estos mismos valores. */
</style>

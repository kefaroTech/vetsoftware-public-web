<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { useOwnerSearch } from '@/features/dashboard/views/consulta/nueva/composables/useOwnerSearch'
import { apptInitials } from '../types/appointment'
import type { Owner } from '@/types/domain'

/**
 * Buscador de propietario (por nombre, ID o documento) — reutiliza
 * `useOwnerSearch` / `ownerApi.search()`. v-model = ownerId (string) y emite el
 * Owner seleccionado para que el padre cargue sus mascotas.
 */
const props = defineProps<{
  modelValue: string | null
  /** Nombre precargado (modo edición) cuando ya hay ownerId pero no Owner. */
  initialName?: string | null
  /** Marca el campo como inválido (borde rojo + shake) cuando falta el sujeto de la cita. */
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  select: [owner: Owner | null]
}>()

const query = ref('')
const { results, loading } = useOwnerSearch(query)
const open = ref(false)
/**
 * El único elemento enfocable dentro del recuadro es el `<input>`, así que esto es
 * equivalente al `:focus-within` que había en CSS. Se sube al script porque el
 * estado «inválido y con el foco dentro» se pinta ahora con la primitiva
 * `.ds-field-invalid-focus`, que se aplica desde la plantilla.
 */
const focused = ref(false)
const box = ref<HTMLElement | null>(null)
const selectedOwner = ref<Owner | null>(null)

// Nombre a mostrar en la tarjeta seleccionada (Owner elegido o seed de edición).
function onFocus() {
  open.value = true
  focused.value = true
}

const selectedName = computed(() => selectedOwner.value?.name ?? props.initialName ?? '')

const hasSelection = computed(() => !!props.modelValue)

function choose(owner: Owner) {
  selectedOwner.value = owner
  emit('update:modelValue', owner.id)
  emit('select', owner)
  open.value = false
  query.value = ''
}

function change() {
  selectedOwner.value = null
  emit('update:modelValue', null)
  emit('select', null)
  open.value = true
}

function onDocMouseDown(e: MouseEvent) {
  if (box.value && !box.value.contains(e.target as Node)) open.value = false
}

watch(query, () => {
  if (query.value) open.value = true
})

onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))
</script>

<template>
  <div v-if="hasSelection" class="owner-selected ds-flex-row">
    <div class="owner-avatar">{{ apptInitials(selectedName || '?') }}</div>
    <div class="ds-flex-fill">
      <div class="owner-name ds-truncate">{{ selectedName || 'Propietario seleccionado' }}</div>
      <div class="owner-meta ds-hint ds-truncate">ID {{ modelValue }}</div>
    </div>
    <button type="button" class="owner-change" @click="change">Cambiar</button>
  </div>

  <div v-else ref="box" class="combo">
    <!--
      Los dos tonos son excluyentes: con el campo válido mandan `.tone-border`/
      `.tone-bg` + `.ds-focus-ring`; con el campo inválido esas tres clases se
      retiran para que ninguna regla scoped (0,2,0) le gane al rojo de
      `.ds-field-invalid` / `.ds-field-invalid-focus` (0,1,0). `.invalid` se
      conserva porque de ella cuelgan el borde del foco y el icono.
    -->
    <div
      class="combo-input ds-flex-row"
      :class="
        invalid
          ? ['invalid', 'ds-field-invalid', { 'ds-field-invalid-focus': focused }]
          : ['tone-border', 'tone-bg', 'ds-focus-ring']
      "
    >
      <Search :size="15" :stroke-width="1.7" class="combo-icon" />
      <input
        v-model="query"
        type="text"
        placeholder="Buscar por nombre, ID o documento…"
        :aria-invalid="invalid || undefined"
        @focus="onFocus"
        @blur="focused = false"
      />
    </div>
    <div v-if="open" class="combo-list">
      <div v-if="loading" class="combo-empty">Buscando…</div>
      <div v-else-if="query && results.length === 0" class="combo-empty">
        Sin resultados para “{{ query }}”.
      </div>
      <div v-else-if="!query" class="combo-empty">Escribe para buscar un propietario.</div>
      <button
        v-for="o in results"
        :key="o.id"
        type="button"
        class="combo-item ds-flex-row"
        @click="choose(o)"
      >
        <div class="owner-avatar sm">{{ apptInitials(o.name) }}</div>
        <div class="ds-flex-fill">
          <div class="owner-name ds-truncate">{{ o.name }}</div>
          <div class="owner-meta ds-hint ds-truncate">
            ID {{ o.id }}<template v-if="o.document"> · {{ o.document }}</template>
            <template v-if="o.phone"> · {{ o.phone }}</template>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.combo {
  position: relative;
}

/* La base se queda con la GEOMETRÍA. Ni `background` ni `border-color`: en CSS
   scoped esta regla pesa (0,2,0) y le ganaría a `.ds-field-invalid` (0,1,0).
   El color vive en las clases de tono, que el marcado aplica de forma
   excluyente — mismo reparto que `BaseInput`. */
.combo-input {
  border-width: 1px;
  border-style: solid;
  border-radius: 8px;
  padding: 9px 11px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

/* Tono en reposo, partido en las dos propiedades que el estado inválido
   sustituye (`.ds-field-invalid` trae las dos). Conservan el peso (0,2,0) y la
   posición que tenía el par dentro de `.combo-input`. */
.tone-border {
  border-color: var(--warm-450);
}

.tone-bg {
  background: var(--warm-50);
}

/* El fondo+borde rojos y el temblor los pone `.ds-field-invalid`
   (primitives.css), con su propio `@keyframes shake`. El halo del foco,
   `.ds-field-invalid-focus`. Sólo queda aquí el `border-color` del foco, que
   tiene que ganarle al de la primitiva. */
.combo-input.invalid:focus-within {
  border-color: oklch(55% 0.22 25deg);
}

.combo-input.invalid .combo-icon {
  color: oklch(55% 0.22 25deg);
}

.combo-input input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 13.5px;
  color: var(--warm-900);
  min-width: 0;
}

.combo-list {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  box-shadow: 0 14px 34px -10px rgb(20 15 30 / 28%);
  overflow: hidden auto;
  max-height: 260px;
  padding: 4px;
}

/* Resto sobre `.ds-flex-row`: gap propio (10px, fuera del catálogo 8/12). */
.combo-item {
  gap: var(--space-10);
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  padding: 8px 9px;
  border-radius: 8px;
  transition: background 0.1s;
}

.combo-item:hover {
  background: var(--amatista-50);
}

.combo-empty {
  padding: 12px 10px;
  font-size: 12.5px;
  color: var(--warm-500);
}

/* Resto sobre `.ds-flex-row`: gap propio (10px, fuera del catálogo 8/12). */
.owner-selected {
  gap: var(--space-10);
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 8px 10px;
}

.owner-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, oklch(78% 0.14 30deg), oklch(65% 0.16 350deg));
  color: white;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
}

.owner-avatar.sm {
  width: 30px;
  height: 30px;
  font-size: 11px;
}

.owner-name {
  color: var(--warm-900);
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
}

.owner-meta {
  margin-top: 1px;
}

.owner-change {
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--amatista-700);
  background: var(--amatista-50);

  /* A11Y-09: `--amatista-200` daba 1,34:1 en reposo y 1,21:1 con el relleno del
     hover — el botón «cambiar» no tenía frontera. `--amatista-500` da 4,24:1 y
     3,86:1. */
  border: 1px solid var(--amatista-500);
  border-radius: 7px;
  padding: 6px 11px;
  cursor: pointer;
}

.owner-change:hover {
  background: var(--amatista-100);
}
</style>

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
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  select: [owner: Owner | null]
}>()

const query = ref('')
const { results, loading } = useOwnerSearch(query)
const open = ref(false)
const box = ref<HTMLElement | null>(null)
const selectedOwner = ref<Owner | null>(null)

// Nombre a mostrar en la tarjeta seleccionada (Owner elegido o seed de edición).
const selectedName = computed(
  () => selectedOwner.value?.name ?? props.initialName ?? '',
)

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
  <div v-if="hasSelection" class="owner-selected">
    <div class="owner-avatar">{{ apptInitials(selectedName || '?') }}</div>
    <div class="owner-info">
      <div class="owner-name">{{ selectedName || 'Propietario seleccionado' }}</div>
      <div class="owner-meta">ID {{ modelValue }}</div>
    </div>
    <button type="button" class="owner-change" @click="change">Cambiar</button>
  </div>

  <div v-else ref="box" class="combo">
    <div class="combo-input">
      <Search :size="15" :stroke-width="1.7" class="combo-icon" />
      <input
        v-model="query"
        type="text"
        placeholder="Buscar por nombre, ID o documento…"
        @focus="open = true"
      />
    </div>
    <div v-if="open" class="combo-list">
      <div v-if="loading" class="combo-empty">Buscando…</div>
      <div v-else-if="query && results.length === 0" class="combo-empty">
        Sin resultados para “{{ query }}”.
      </div>
      <div v-else-if="!query" class="combo-empty">
        Escribe para buscar un propietario.
      </div>
      <button
        v-for="o in results"
        :key="o.id"
        type="button"
        class="combo-item"
        @click="choose(o)"
      >
        <div class="owner-avatar sm">{{ apptInitials(o.name) }}</div>
        <div class="owner-info">
          <div class="owner-name">{{ o.name }}</div>
          <div class="owner-meta">
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
.combo-input {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 9px 11px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.combo-input:focus-within {
  border-color: var(--amatista-500);
  box-shadow: 0 0 0 3px var(--amatista-50);
}
.combo-icon {
  color: var(--warm-500);
  flex-shrink: 0;
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
  box-shadow: 0 14px 34px -10px rgba(20, 15, 30, 0.28);
  overflow: hidden auto;
  max-height: 260px;
  padding: 4px;
}
.combo-item {
  display: flex;
  align-items: center;
  gap: 10px;
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
.owner-selected {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 8px 10px;
}
.owner-info {
  min-width: 0;
  flex: 1;
}
.owner-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(135deg, oklch(78% 0.14 30), oklch(65% 0.16 350));
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
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.owner-meta {
  font-size: 11.5px;
  color: var(--warm-500);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.owner-change {
  margin-left: auto;
  flex-shrink: 0;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--amatista-700);
  background: var(--amatista-50);
  border: 1px solid var(--amatista-200);
  border-radius: 7px;
  padding: 6px 11px;
  cursor: pointer;
}
.owner-change:hover {
  background: var(--amatista-100);
}
</style>

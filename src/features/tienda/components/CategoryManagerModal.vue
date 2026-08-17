<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/components/ui/ModalShell.vue'
import AccentButton from './AccentButton.vue'
import type { CategoryResponse } from '../types/tienda'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    categories: CategoryResponse[]
    /** Mapa { [catId]: nº de ítems usando la categoría } para bloquear borrado. */
    counts: Record<number, number>
    /** Gating por permisos (el back exige {productCategory,serviceCategory}.{create,update,delete}). */
    canCreate?: boolean
    canUpdate?: boolean
    canDelete?: boolean
  }>(),
  { canCreate: true, canUpdate: true, canDelete: true },
)

const emit = defineEmits<{
  close: []
  upsert: [payload: { id: number | null; name: string; description: string; version?: number }]
  remove: [id: number]
}>()

const adding = ref(false)
const draftName = ref('')
const draftDesc = ref('')

const editingId = ref<number | null>(null)
const editName = ref('')
const editDesc = ref('')

const confirmingId = ref<number | null>(null)

const canSaveNew = computed(
  () => draftName.value.trim().length >= 2 && draftDesc.value.trim().length >= 1,
)
// Espejo de canSaveNew para el editor: refleja el guard de saveEdit (nombre ≥ 2, descripción ≥ 1)
// para deshabilitar "Guardar" en vez de que retorne en silencio.
const canSaveEdit = computed(
  () => editName.value.trim().length >= 2 && editDesc.value.trim().length >= 1,
)

function startAdd() {
  adding.value = true
  draftName.value = ''
  draftDesc.value = ''
}
function cancelAdd() {
  adding.value = false
}
function saveNew() {
  if (!canSaveNew.value) return
  emit('upsert', { id: null, name: draftName.value.trim(), description: draftDesc.value.trim() })
  adding.value = false
}

function startEdit(cat: CategoryResponse) {
  editingId.value = cat.id
  editName.value = cat.name
  editDesc.value = cat.description ?? ''
}
function cancelEdit() {
  editingId.value = null
}
function saveEdit(id: number) {
  if (editName.value.trim().length < 2 || editDesc.value.trim().length < 1) return
  // La versión (@Version) se lee de la lista reactiva en el momento del guardado; tras un 409 el
  // padre refresca `categories`, así que un reintento envía la versión fresca sin cerrar el editor.
  const version = props.categories.find((c) => c.id === id)?.version
  emit('upsert', { id, name: editName.value.trim(), description: editDesc.value.trim(), version })
  editingId.value = null
}

function requestRemove(id: number) {
  if ((props.counts[id] ?? 0) > 0) return
  confirmingId.value = id
}
function confirmRemove(id: number) {
  emit('remove', id)
  confirmingId.value = null
}
</script>

<template>
  <ModalShell
    :open="open"
    :title="title"
    subtitle="Crea, renombra o elimina categorías. No puedes eliminar una categoría en uso."
    :icon="Tag"
    :width="560"
    @close="emit('close')"
  >
    <template #body>
      <div class="manager ds-stack ds-stack--14">
        <AccentButton v-if="!adding && canCreate" size="md" class="add-btn" @click="startAdd">
          <Plus :size="15" :stroke-width="1.8" /> Nueva categoría
        </AccentButton>

        <div v-else-if="adding" class="editor">
          <input
            v-model="draftName"
            type="text"
            class="ed-input"
            placeholder="Nombre de la categoría"
            @keyup.enter="saveNew"
          />
          <input
            v-model="draftDesc"
            type="text"
            class="ed-input"
            placeholder="Descripción"
            @keyup.enter="saveNew"
          />
          <div class="ed-actions">
            <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="cancelAdd">
              Cancelar
            </button>
            <button
              type="button"
              class="ds-btn ds-btn--primary ds-btn--snug"
              :disabled="!canSaveNew"
              @click="saveNew"
            >
              Guardar
            </button>
          </div>
        </div>

        <ul class="list">
          <li v-for="cat in categories" :key="cat.id" class="row">
            <template v-if="editingId === cat.id">
              <div class="editor inline">
                <input
                  v-model="editName"
                  type="text"
                  class="ed-input"
                  @keyup.enter="saveEdit(cat.id)"
                />
                <input
                  v-model="editDesc"
                  type="text"
                  class="ed-input"
                  placeholder="Descripción"
                  @keyup.enter="saveEdit(cat.id)"
                />
                <div class="ed-actions">
                  <button
                    type="button"
                    class="ds-btn ds-btn--ghost ds-btn--snug"
                    @click="cancelEdit"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    class="ds-btn ds-btn--primary ds-btn--snug"
                    :disabled="!canSaveEdit"
                    @click="saveEdit(cat.id)"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="row-main">
                <span class="cat-name">{{ cat.name }}</span>
                <span class="ds-hint"
                  >{{ counts[cat.id] ?? 0 }}
                  {{ (counts[cat.id] ?? 0) === 1 ? 'ítem' : 'ítems' }}</span
                >
              </div>
              <div v-if="confirmingId === cat.id" class="confirm">
                <span>¿Eliminar?</span>
                <button type="button" class="btn-danger-sm" @click="confirmRemove(cat.id)">
                  Sí
                </button>
                <button type="button" class="btn-ghost-sm" @click="confirmingId = null">No</button>
              </div>
              <div v-else-if="canUpdate || canDelete" class="row-actions">
                <button
                  v-if="canUpdate"
                  type="button"
                  class="ds-icon-btn"
                  title="Editar"
                  @click="startEdit(cat)"
                >
                  <Pencil :size="14" :stroke-width="1.7" />
                </button>
                <button
                  v-if="canDelete"
                  type="button"
                  class="ds-icon-btn ds-icon-btn--danger"
                  :disabled="(counts[cat.id] ?? 0) > 0"
                  :title="
                    (counts[cat.id] ?? 0) > 0
                      ? 'No se puede eliminar: categoría en uso'
                      : 'Eliminar'
                  "
                  @click="requestRemove(cat.id)"
                >
                  <Trash2 :size="14" :stroke-width="1.7" />
                </button>
              </div>
            </template>
          </li>
          <li v-if="categories.length === 0" class="ds-empty ds-empty--tight">
            Aún no hay categorías.
          </li>
        </ul>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--ghost ds-btn--snug" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* La columna es `.ds-stack--14`; aquí solo queda la fuente del modal. */
.manager {
  font-family: var(--font-sans);
}

/* El botón es `AccentButton`; su colocación en la columna sigue siendo local. */
.add-btn {
  align-self: flex-start;
}
.editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--warm-100);
  border-radius: 10px;
  padding: 12px;
}
.editor.inline {
  width: 100%;
}

.ed-input {
  width: 100%;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 13.5px;
  color: var(--warm-900);
  outline: none;
}
.ed-input:focus {
  border-color: var(--amatista-500);
  box-shadow: var(--ring);
}
.ed-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}
.row-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.cat-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--warm-900);
}
.row-actions {
  display: flex;
  gap: 6px;
}

.confirm {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--warm-700);
}

.btn-danger-sm {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 7px;
  cursor: pointer;
  border: none;
  background: var(--danger-500);
  color: white;
}

.btn-ghost-sm {
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 7px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--warm-200);
  color: var(--warm-700);
}
</style>

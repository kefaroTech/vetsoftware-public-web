<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import type { CategoryResponse } from '../types/tienda'

const props = defineProps<{
  open: boolean
  title: string
  categories: CategoryResponse[]
  /** Mapa { [catId]: nº de ítems usando la categoría } para bloquear borrado. */
  counts: Record<number, number>
}>()

const emit = defineEmits<{
  close: []
  upsert: [payload: { id: number | null; name: string; description: string }]
  remove: [id: number]
}>()

const adding = ref(false)
const draftName = ref('')
const draftDesc = ref('')

const editingId = ref<number | null>(null)
const editName = ref('')
const editDesc = ref('')

const confirmingId = ref<number | null>(null)

const canSaveNew = computed(() => draftName.value.trim().length >= 2)

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
  if (editName.value.trim().length < 2) return
  emit('upsert', { id, name: editName.value.trim(), description: editDesc.value.trim() })
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
      <div class="manager">
        <button v-if="!adding" type="button" class="add-btn" @click="startAdd">
          <Plus :size="15" :stroke-width="1.8" /> Nueva categoría
        </button>

        <div v-else class="editor">
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
            placeholder="Descripción (opcional)"
            @keyup.enter="saveNew"
          />
          <div class="ed-actions">
            <button type="button" class="btn-ghost" @click="cancelAdd">Cancelar</button>
            <button type="button" class="btn-primary" :disabled="!canSaveNew" @click="saveNew">
              Guardar
            </button>
          </div>
        </div>

        <ul class="list">
          <li v-for="cat in categories" :key="cat.id" class="row">
            <template v-if="editingId === cat.id">
              <div class="editor inline">
                <input v-model="editName" type="text" class="ed-input" @keyup.enter="saveEdit(cat.id)" />
                <input v-model="editDesc" type="text" class="ed-input" placeholder="Descripción" @keyup.enter="saveEdit(cat.id)" />
                <div class="ed-actions">
                  <button type="button" class="btn-ghost" @click="cancelEdit">Cancelar</button>
                  <button type="button" class="btn-primary" @click="saveEdit(cat.id)">Guardar</button>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="row-main">
                <span class="cat-name">{{ cat.name }}</span>
                <span class="count">{{ counts[cat.id] ?? 0 }} {{ (counts[cat.id] ?? 0) === 1 ? 'ítem' : 'ítems' }}</span>
              </div>
              <div v-if="confirmingId === cat.id" class="confirm">
                <span>¿Eliminar?</span>
                <button type="button" class="btn-danger-sm" @click="confirmRemove(cat.id)">Sí</button>
                <button type="button" class="btn-ghost-sm" @click="confirmingId = null">No</button>
              </div>
              <div v-else class="row-actions">
                <button type="button" class="icon-btn" title="Editar" @click="startEdit(cat)">
                  <Pencil :size="14" :stroke-width="1.7" />
                </button>
                <button
                  type="button"
                  class="icon-btn danger"
                  :disabled="(counts[cat.id] ?? 0) > 0"
                  :title="(counts[cat.id] ?? 0) > 0 ? 'No se puede eliminar: categoría en uso' : 'Eliminar'"
                  @click="requestRemove(cat.id)"
                >
                  <Trash2 :size="14" :stroke-width="1.7" />
                </button>
              </div>
            </template>
          </li>
          <li v-if="categories.length === 0" class="empty">Aún no hay categorías.</li>
        </ul>
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="btn-ghost" @click="emit('close')">Cerrar</button>
    </template>
  </ModalShell>
</template>

<style scoped>
.manager { display: flex; flex-direction: column; gap: 14px; font-family: var(--font-sans); }
.add-btn {
  display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
  padding: 9px 14px; font-size: 13px; font-weight: 500; font-family: inherit;
  background: var(--amatista-50); color: var(--amatista-700);
  border: 1px solid var(--amatista-200); border-radius: 9px; cursor: pointer;
}
.add-btn:hover { background: var(--amatista-100); }
.editor { display: flex; flex-direction: column; gap: 8px; background: var(--warm-100); border-radius: 10px; padding: 12px; }
.editor.inline { width: 100%; }
.ed-input {
  width: 100%; background: var(--warm-50); border: 1px solid var(--warm-200);
  border-radius: 8px; padding: 9px 12px; font-family: inherit; font-size: 13px; color: var(--warm-900); outline: none;
}
.ed-input:focus { border-color: var(--amatista-500); box-shadow: 0 0 0 3px var(--amatista-50); }
.ed-actions { display: flex; justify-content: flex-end; gap: 8px; }
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 12px; background: var(--warm-50); border: 1px solid var(--warm-200); border-radius: 10px;
}
.row-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
.cat-name { font-size: 13.5px; font-weight: 500; color: var(--warm-900); }
.count { font-size: 11.5px; color: var(--warm-500); }
.row-actions { display: flex; gap: 6px; }
.icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 7px;
  border: 1px solid var(--warm-200); background: transparent; color: var(--warm-700); cursor: pointer;
}
.icon-btn:hover:not(:disabled) { background: var(--warm-100); }
.icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.icon-btn.danger:hover:not(:disabled) { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
.confirm { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--warm-700); }
.empty { font-size: 13px; color: var(--warm-500); text-align: center; padding: 16px; }
.btn-primary {
  font-family: inherit; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 9px; cursor: pointer;
  border: none; color: white;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
}
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  font-family: inherit; font-size: 13px; font-weight: 500; padding: 8px 14px; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
.btn-ghost:hover { background: var(--warm-100); }
.btn-danger-sm {
  font-family: inherit; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 7px; cursor: pointer;
  border: none; background: oklch(55% 0.18 25); color: white;
}
.btn-ghost-sm {
  font-family: inherit; font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 7px; cursor: pointer;
  background: transparent; border: 1px solid var(--warm-200); color: var(--warm-700);
}
</style>

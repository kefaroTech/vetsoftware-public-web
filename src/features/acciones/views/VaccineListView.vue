<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import VaccineFormModal from '../modals/VaccineFormModal.vue'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  vaccinationApi,
  type VaccinationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/vaccination.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const canCreate = can(PERMISSIONS.VACCINATION_CREATE)
const canUpdate = can(PERMISSIONS.VACCINATION_UPDATE)
const canDelete = can(PERMISSIONS.VACCINATION_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const items = ref<VaccinationResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<VaccinationResponse | null>(null)
const deleting = ref<VaccinationResponse | null>(null)
const deletingBusy = ref(false)

async function onSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  selection.value = info
  loading.value = true
  error.value = null
  items.value = []
  try {
    items.value = await vaccinationApi.listByAnimal(info.animal.id)
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'No se pudieron cargar las vacunaciones'
  } finally {
    loading.value = false
  }
}

function onReset() {
  selection.value = null
  patientId.value = null
  items.value = []
  error.value = null
}

function onSaved(item: VaccinationResponse) {
  const idx = items.value.findIndex((i) => i.id === item.id)
  if (idx >= 0) items.value.splice(idx, 1, item)
  else items.value = [item, ...items.value]
}

function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

async function onConfirmDelete() {
  const target = deleting.value
  if (!target) return
  deletingBusy.value = true
  error.value = null
  try {
    await vaccinationApi.remove(target.id)
    items.value = items.value.filter((i) => i.id !== target.id)
    deleting.value = null
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudo eliminar'
  } finally {
    deletingBusy.value = false
  }
}

function searchFn(item: VaccinationResponse, q: string) {
  return (
    item.vaccinationType.name.toLowerCase().includes(q) ||
    (item.lot ?? '').toLowerCase().includes(q)
  )
}
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <div class="kicker">Acciones clínicas</div>
        <h1 class="title">Vacunaciones</h1>
        <div class="lead">Aplicaciones independientes de una consulta.</div>
      </div>
      <button
        v-if="canCreate && selection"
        type="button"
        class="cta"
        @click="modalOpen = true"
      >
        <Plus :size="16" :stroke-width="1.8" /> Nueva vacunación
      </button>
    </div>

    <div v-if="error" class="banner error">{{ error }}</div>

    <PatientCascadePicker
      v-if="!selection"
      v-model="patientId"
      @update:selection="onSelect"
    />

    <template v-else>
      <OwnerAnimalBreadcrumb
        :owner="selection.owner"
        :animal="selection.animal"
        @reset="onReset"
      />
      <ListBody
        :items="items"
        :loading="loading"
        :search-fn="searchFn"
        placeholder="Buscar vacuna o lote…"
        empty-text="Este paciente aún no tiene vacunaciones registradas."
      >
        <template #header>
          <tr>
            <th>Fecha</th>
            <th>Vacuna</th>
            <th>Lote</th>
            <th>Próxima</th>
            <th v-if="canUpdate || canDelete" class="actions-col">Acciones</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr>
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ item.vaccinationType.name }}</td>
            <td class="mono">{{ item.lot }}</td>
            <td>{{ item.nextVaccination ? formatDateShort(item.nextVaccination) : '—' }}</td>
            <td v-if="canUpdate || canDelete" class="actions">
              <button
                v-if="canUpdate"
                type="button"
                class="icon-btn"
                title="Editar"
                @click="editing = item"
              >
                <Pencil :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="icon-btn danger"
                title="Eliminar"
                @click="deleting = item"
              >
                <Trash2 :size="15" :stroke-width="1.7" />
              </button>
            </td>
          </tr>
        </template>
      </ListBody>
    </template>

    <VaccineFormModal
      :open="modalOpen || editing !== null"
      :pre-selected-animal="selection?.animal ?? null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar vacunación"
      :message="deleting ? `Se eliminará la aplicación de ${deleting.vaccinationType.name}. Esta acción no se puede deshacer.` : ''"
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
.kicker { font-size: 12px; color: var(--warm-500); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 6px; }
.title { margin: 0; font-family: var(--font-serif); font-size: 38px; line-height: 1.05; font-weight: 400; letter-spacing: -0.015em; color: var(--warm-900); }
.lead { font-size: 14px; color: var(--warm-600); margin-top: 6px; }
.cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  white-space: nowrap;
}
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.mono { font-family: var(--font-mono, monospace); font-size: 12.5px; }
.actions-col { width: 88px; text-align: right; }
.actions { display: flex; gap: 6px; justify-content: flex-end; }
.icon-btn {
  display: grid; place-items: center; width: 28px; height: 28px;
  border-radius: 7px; border: 1px solid var(--warm-200);
  background: transparent; color: var(--warm-700); cursor: pointer;
}
.icon-btn:hover { background: var(--warm-100); }
.icon-btn.danger:hover { background: oklch(95% 0.06 25); color: oklch(40% 0.18 25); border-color: oklch(85% 0.12 25); }
</style>

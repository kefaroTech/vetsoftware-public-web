<script setup lang="ts">
import { ref } from 'vue'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import DewormFormModal from '../modals/DewormFormModal.vue'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  dewormingApi,
  type DewormingResponse,
} from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.DEWORMING_CREATE)
const canUpdate = can(PERMISSIONS.DEWORMING_UPDATE)
const canDelete = can(PERMISSIONS.DEWORMING_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const items = ref<DewormingResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<DewormingResponse | null>(null)
const deleting = ref<DewormingResponse | null>(null)
const deletingBusy = ref(false)

async function onSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  selection.value = info
  loading.value = true
  error.value = null
  items.value = []
  try {
    items.value = await dewormingApi.listByAnimal(info.animal.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las desparasitaciones'
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

function onSaved(item: DewormingResponse) {
  const idx = items.value.findIndex((i) => i.id === item.id)
  const wasEdit = idx >= 0
  if (wasEdit) items.value.splice(idx, 1, item)
  else items.value = [item, ...items.value]
  toast.success(
    'Desparasitación guardada',
    wasEdit ? 'Los cambios se guardaron.' : 'Se añadió correctamente al paciente.',
  )
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
    await dewormingApi.remove(target.id)
    items.value = items.value.filter((i) => i.id !== target.id)
    deleting.value = null
    toast.info('Registro eliminado', 'El registro fue removido.')
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'No se pudo eliminar'
    error.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    deletingBusy.value = false
  }
}

function searchFn(item: DewormingResponse, q: string) {
  return item.product.toLowerCase().includes(q)
}

function typeLabel(t: DewormingResponse['type']): string {
  switch (t) {
    case 'INTERNAL':
      return 'Interna'
    case 'EXTERNAL':
      return 'Externa'
    case 'MIX':
      return 'Mixta'
    case 'OTHER':
    default:
      return 'Otra'
  }
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Acciones clínicas"
      title="Desparasitaciones"
      lead="Tratamientos antiparasitarios independientes de una consulta."
    >
      <template #action>
        <button
          v-if="canCreate && selection"
          type="button"
          class="cta"
          @click="modalOpen = true"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nueva desparasitación
        </button>
      </template>
    </PageHeader>

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
        placeholder="Buscar producto…"
        empty-text="Este paciente aún no tiene desparasitaciones registradas."
      >
        <template #header>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Producto</th>
            <th>Dosis</th>
            <th>Próximo</th>
            <th v-if="canUpdate || canDelete" class="actions-col">Acciones</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr>
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ typeLabel(item.type) }}</td>
            <td>{{ item.product }}</td>
            <td>{{ item.dosage }}</td>
            <td>{{ item.nextControl ? formatDateShort(item.nextControl) : '—' }}</td>
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

    <DewormFormModal
      :open="modalOpen || editing !== null"
      :pre-selected-animal="selection?.animal ?? null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar desparasitación"
      :message="deleting ? `Se eliminará el registro de ${deleting.product}. Esta acción no se puede deshacer.` : ''"
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />
  </div>
</template>

<style scoped>
.page { font-family: var(--font-sans); color: var(--warm-900); }
.cta {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px;
  font-size: 13.5px; font-weight: 500;
  background: linear-gradient(135deg, oklch(45% 0.18 var(--hue)), oklch(38% 0.18 calc(var(--hue) - 5)));
  color: white; border: none; border-radius: 9px; cursor: pointer; font-family: inherit;
  box-shadow: 0 1px 2px rgba(50, 20, 80, 0.08), 0 6px 16px -6px oklch(40% 0.18 var(--hue) / 0.5);
  white-space: nowrap;
}
.banner.error { background: oklch(95% 0.06 25); border: 1px solid oklch(85% 0.12 25); color: oklch(40% 0.18 25); border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
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

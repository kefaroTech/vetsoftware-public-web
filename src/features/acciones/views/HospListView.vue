<script setup lang="ts">
/** Tope de pagina que acepta el backend para historiales por animal. */
const MAX_HISTORY_PAGE_SIZE = 200
import { ref } from 'vue'
import { BedDouble, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import StatusPill from '../components/StatusPill.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import HospFormModal from '../modals/HospFormModal.vue'
import AccionDetailModal, { type DetailFieldDef } from '../modals/AccionDetailModal.vue'
import ConfirmDeleteDialog from '@/components/ui/ConfirmDeleteDialog.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import {
  hospitalizationApi,
  type HospitalizationResponse,
} from '@/features/dashboard/views/consulta/nueva/api/hospitalization.api'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/api/animal.api'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.HOSPITALIZATION_CREATE)
const canUpdate = can(PERMISSIONS.HOSPITALIZATION_UPDATE)
const canDelete = can(PERMISSIONS.HOSPITALIZATION_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const items = ref<HospitalizationResponse[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<HospitalizationResponse | null>(null)
const deleting = ref<HospitalizationResponse | null>(null)
const deletingBusy = ref(false)
const viewing = ref<HospitalizationResponse | null>(null)

function reasonLeavingLabel(r: HospitalizationResponse['reasonLeaving']): string | null {
  if (!r) return null
  return String(r).toLowerCase().replace(/_/g, ' ')
}

function detailFields(item: HospitalizationResponse): DetailFieldDef[] {
  return [
    { label: 'Tipo', value: typeLabel(item.type) },
    { label: 'Inicio', value: formatDateShort(item.startDate) },
    { label: 'Fin', value: item.endDate ? formatDateShort(item.endDate) : null },
    { label: 'Motivo de egreso', value: reasonLeavingLabel(item.reasonLeaving) },
    { label: 'Motivo', value: item.reason, span: 'full' },
    { label: 'Observaciones', value: item.observations, span: 'full' },
  ]
}

function onRowClick(item: HospitalizationResponse) {
  viewing.value = item
}
function closeViewing() {
  viewing.value = null
}
function editFromViewing() {
  if (viewing.value) {
    editing.value = viewing.value
    viewing.value = null
  }
}

async function onSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  selection.value = info
  loading.value = true
  error.value = null
  items.value = []
  try {
    // BE-06: el endpoint ya esta paginado. Esta vista aun no acumula paginas, asi
    // que pide el tope que admite el servidor para no ocultar historial en silencio.
    // Pendiente: cablear el centinela de useInfiniteList (ver OwnerSearchList).
    items.value = (
      await hospitalizationApi.listByAnimal(info.animal.id, 0, MAX_HISTORY_PAGE_SIZE)
    ).content
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No se pudieron cargar las hospitalizaciones'
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

function onSaved(item: HospitalizationResponse) {
  const idx = items.value.findIndex((i) => i.id === item.id)
  const wasEdit = idx >= 0
  if (wasEdit) items.value.splice(idx, 1, item)
  else items.value = [item, ...items.value]
  toast.success(
    'Hospitalización guardada',
    wasEdit ? 'Los cambios se guardaron.' : 'Se añadió correctamente al paciente.',
  )
  if (!wasEdit && selection.value) {
    openBilling({
      ownerId: Number(selection.value.owner.id),
      ownerName: selection.value.owner.name,
      animalId: selection.value.animal.id,
      animalName: selection.value.animal.name,
      heading: 'Facturación · Hospitalización',
    })
  }
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
    await hospitalizationApi.remove(target.id)
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

function searchFn(item: HospitalizationResponse, q: string) {
  return item.reason.toLowerCase().includes(q)
}

function typeLabel(type: HospitalizationResponse['type']): string {
  return type === 'HOSPITALIZATION' ? 'Hospitalización' : 'Ambulatoria'
}

function isActive(item: HospitalizationResponse): boolean {
  return !item.endDate && !item.reasonLeaving
}
</script>

<template>
  <div class="page">
    <PageHeader
      kicker="Acciones clínicas"
      title="Hospitalizaciones"
      lead="Ingresos hospitalarios y ambulatorios independientes de una consulta."
    >
      <template #action>
        <button v-if="canCreate && selection" type="button" class="cta" @click="modalOpen = true">
          <Plus :size="16" :stroke-width="1.8" /> Nueva hospitalización
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="banner error">{{ error }}</div>

    <PatientCascadePicker v-if="!selection" v-model="patientId" @update:selection="onSelect" />

    <template v-else>
      <OwnerAnimalBreadcrumb :owner="selection.owner" :animal="selection.animal" @reset="onReset" />
      <ListBody
        :items="items"
        :loading="loading"
        :search-fn="searchFn"
        placeholder="Buscar razón…"
        empty-text="Este paciente aún no tiene hospitalizaciones registradas."
      >
        <template #header>
          <tr>
            <th>Inicio</th>
            <th>Tipo</th>
            <th>Razón</th>
            <th>Estado</th>
            <th v-if="canUpdate || canDelete" class="actions-col">Acciones</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr class="clickable-row" @click="onRowClick(item)">
            <td>{{ formatDateShort(item.startDate) }}</td>
            <td>{{ typeLabel(item.type) }}</td>
            <td class="ellipsis">{{ item.reason }}</td>
            <td>
              <StatusPill v-if="isActive(item)" label="Activa" tone="warn" />
              <StatusPill v-else label="Cerrada" tone="success" />
            </td>
            <td v-if="canUpdate || canDelete" class="actions">
              <button
                v-if="canUpdate"
                type="button"
                class="icon-btn"
                title="Editar"
                @click.stop="editing = item"
              >
                <Pencil :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="icon-btn danger"
                title="Eliminar"
                @click.stop="deleting = item"
              >
                <Trash2 :size="15" :stroke-width="1.7" />
              </button>
            </td>
          </tr>
        </template>
      </ListBody>
    </template>

    <HospFormModal
      :open="modalOpen || editing !== null"
      :pre-selected-animal="selection?.animal ?? null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar hospitalización"
      message="Se eliminará el registro de ingreso. Esta acción no se puede deshacer."
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />

    <AccionDetailModal
      :open="viewing !== null"
      title="Detalle de la hospitalización"
      :icon="BedDouble"
      :fields="viewing ? detailFields(viewing) : []"
      :can-edit="canUpdate"
      @close="closeViewing"
      @edit="editFromViewing"
    />
  </div>
</template>

<style scoped>
.page {
  font-family: var(--font-sans);
  color: var(--warm-900);
}

.cta {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13.5px;
  font-weight: 500;
  background: linear-gradient(
    135deg,
    oklch(45% 0.18 var(--hue)),
    oklch(38% 0.18 calc(var(--hue) - 5))
  );
  color: white;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font-family: inherit;
  box-shadow:
    0 1px 2px rgb(50 20 80 / 8%),
    0 6px 16px -6px oklch(40% 0.18 var(--hue) / 50%);
  white-space: nowrap;
}
.banner.error {
  background: oklch(95% 0.06 25deg);
  border: 1px solid oklch(85% 0.12 25deg);
  color: oklch(40% 0.18 25deg);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  margin-bottom: 14px;
}
.ellipsis {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions-col {
  width: 88px;
  text-align: right;
}
.actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  border: 1px solid var(--warm-200);
  background: transparent;
  color: var(--warm-700);
  cursor: pointer;
}
.icon-btn:hover {
  background: var(--warm-100);
}
.icon-btn.danger:hover {
  background: oklch(95% 0.06 25deg);
  color: oklch(40% 0.18 25deg);
  border-color: oklch(85% 0.12 25deg);
}
.clickable-row {
  cursor: pointer;
  transition: background 0.12s ease;
}
.clickable-row:hover td {
  background: var(--amatista-50);
}
</style>

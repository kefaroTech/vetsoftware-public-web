<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { emptyPage } from '@/types/pagination'
import { Bug, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import DewormFormModal from '../modals/DewormFormModal.vue'
import AccionDetailModal, { type DetailFieldDef } from '../modals/AccionDetailModal.vue'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { dewormingApi } from '@/features/dashboard/views/consulta/nueva/api/deworming.api'
import type { DewormingResponse } from '@/features/dashboard/views/consulta/nueva/types/deworming.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/features/dashboard/views/consulta/nueva/composables/format'

const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.DEWORMING_CREATE)
const canUpdate = can(PERMISSIONS.DEWORMING_UPDATE)
const canDelete = can(PERMISSIONS.DEWORMING_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const listBody = useTemplateRef<{ reload: () => Promise<void> }>('listBody')
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<DewormingResponse | null>(null)
const deleting = ref<DewormingResponse | null>(null)
const deletingBusy = ref(false)
const viewing = ref<DewormingResponse | null>(null)

function detailFields(item: DewormingResponse): DetailFieldDef[] {
  return [
    { label: 'Fecha', value: formatDateShort(item.date) },
    { label: 'Tipo', value: typeLabel(item.type) },
    { label: 'Producto', value: item.product },
    { label: 'Dosis', value: item.dosage },
    {
      label: 'Última desparasitación',
      value: item.lastDeworming ? formatDateShort(item.lastDeworming) : null,
    },
    {
      label: 'Próximo control',
      value: item.nextControl ? formatDateShort(item.nextControl) : null,
    },
    { label: 'Observaciones', value: item.observations, span: 'full' },
  ]
}

function onRowClick(item: DewormingResponse) {
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

/**
 * BE-06: la tabla pide cada pagina al backend, busqueda incluida. `ListBody` es quien invoca
 * esto —al montar, al cambiar de pagina y al escribir en el buscador—, asi que aqui ya no hay
 * lista que mantener en memoria. El `:key` del paciente fuerza el remonte al cambiar de animal.
 */
function fetchPage(page: number, pageSize: number, query: string, signal: AbortSignal) {
  const animalId = selection.value?.animal.id
  if (!animalId) return Promise.resolve(emptyPage<DewormingResponse>(pageSize))
  return dewormingApi.listByAnimal(animalId, query, page, pageSize, signal)
}

function onSelect(info: { owner: Owner; animal: AnimalResponse } | null) {
  if (!info) return
  selection.value = info
  error.value = null
}

function onReset() {
  selection.value = null
  patientId.value = null
  error.value = null
}

function onSaved() {
  const wasEdit = Boolean(editing.value)
  // La lista la sirve el backend: en vez de mutar un array local se recarga la pagina.
  void listBody.value?.reload()
  toast.success(
    'Desparasitación guardada',
    wasEdit ? 'Los cambios se guardaron.' : 'Se añadió correctamente al paciente.',
  )
  if (!wasEdit && selection.value) {
    openBilling({
      ownerId: Number(selection.value.owner.id),
      ownerName: selection.value.owner.name,
      animalId: selection.value.animal.id,
      animalName: selection.value.animal.name,
      heading: 'Facturación · Desparasitación',
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
    await dewormingApi.remove(target.id)
    void listBody.value?.reload()
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
  <div class="ds-page">
    <PageHeader
      kicker="Acciones clínicas"
      title="Desparasitaciones"
      lead="Tratamientos antiparasitarios independientes de una consulta."
    >
      <template #action>
        <button
          v-if="canCreate && selection"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          @click="modalOpen = true"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nueva desparasitación
        </button>
      </template>
    </PageHeader>

    <div v-if="error" class="ds-banner ds-banner--error">{{ error }}</div>

    <PatientCascadePicker v-if="!selection" v-model="patientId" @update:selection="onSelect" />

    <template v-else>
      <OwnerAnimalBreadcrumb :owner="selection.owner" :animal="selection.animal" @reset="onReset" />
      <ListBody
        ref="listBody"
        :key="selection.animal.id"
        :fetch-page="fetchPage"
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
          <tr class="clickable-row" @click="onRowClick(item)">
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ typeLabel(item.type) }}</td>
            <td>{{ item.product }}</td>
            <td>{{ item.dosage }}</td>
            <td>{{ item.nextControl ? formatDateShort(item.nextControl) : '—' }}</td>
            <td v-if="canUpdate || canDelete" class="ds-actions">
              <button
                v-if="canUpdate"
                type="button"
                class="ds-icon-btn"
                title="Editar"
                @click.stop="editing = item"
              >
                <Pencil :size="15" :stroke-width="1.7" />
              </button>
              <button
                v-if="canDelete"
                type="button"
                class="ds-icon-btn ds-icon-btn--danger"
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
      :message="
        deleting
          ? `Se eliminará el registro de ${deleting.product}. Esta acción no se puede deshacer.`
          : ''
      "
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />

    <AccionDetailModal
      :open="viewing !== null"
      title="Detalle de la desparasitación"
      :icon="Bug"
      :fields="viewing ? detailFields(viewing) : []"
      :can-edit="canUpdate"
      @close="closeViewing"
      @edit="editFromViewing"
    />
  </div>
</template>

<style scoped>
.actions-col {
  width: 88px;
  text-align: right;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.12s ease;
}
.clickable-row:hover td {
  background: var(--amatista-50);
}
</style>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { emptyPage } from '@/types/pagination'
import { Beaker, Pencil, Plus, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import LabFormModal from '../modals/LabFormModal.vue'
import LabStatusPill from '../components/LabStatusPill.vue'
import AccionDetailModal, { type DetailFieldDef } from '../modals/AccionDetailModal.vue'
import LabResultAttachments from '../components/LabResultAttachments.vue'
import ConfirmDeleteDialog from '@/components/feedback/ConfirmDeleteDialog.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { laboratoryTestApi } from '@/features/dashboard/views/consulta/nueva/api/laboratoryTest.api'
import type { LaboratoryTestResponse } from '@/features/dashboard/views/consulta/nueva/types/laboratoryTest.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/composables/format'
import { getProblemDetailMessage } from '@/services/http/http.client'
const { can } = useAuthorization()
const toast = useToast()
const canCreate = can(PERMISSIONS.LABORATORY_TEST_CREATE)
const canUpdate = can(PERMISSIONS.LABORATORY_TEST_UPDATE)
const canDelete = can(PERMISSIONS.LABORATORY_TEST_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const listBody = useTemplateRef<{ reload: () => Promise<void> }>('listBody')
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<LaboratoryTestResponse | null>(null)
const deleting = ref<LaboratoryTestResponse | null>(null)
const deletingBusy = ref(false)
const viewing = ref<LaboratoryTestResponse | null>(null)

const STATUS_LABEL: Record<LaboratoryTestResponse['status'], string> = {
  PENDING_COLLECTION: 'Pendiente por recolectar',
  PENDING_PROCESSING: 'Pendiente por procesar',
  IN_PROGRESS: 'En proceso',
  PENDING_VALIDATION: 'Por validar',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

function detailFields(item: LaboratoryTestResponse): DetailFieldDef[] {
  return [
    { label: 'Fecha', value: formatDateShort(item.date) },
    { label: 'Tipo de examen', value: item.testType.name },
    { label: 'Cantidad', value: item.quantity },
    { label: 'Estado', value: STATUS_LABEL[item.status] },
    { label: 'Diagnóstico / motivo', value: item.diagnosis, span: 'full' },
  ]
}

function onRowClick(item: LaboratoryTestResponse) {
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
  if (!animalId) return Promise.resolve(emptyPage<LaboratoryTestResponse>(pageSize))
  return laboratoryTestApi.listByAnimal(animalId, query, page, pageSize, signal)
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
    'Examen guardado',
    wasEdit ? 'Los cambios se guardaron.' : 'Se añadió correctamente al paciente.',
  )
  if (!wasEdit && selection.value) {
    openBilling({
      ownerId: Number(selection.value.owner.id),
      ownerName: selection.value.owner.name,
      animalId: selection.value.animal.id,
      animalName: selection.value.animal.name,
      heading: 'Facturación · Laboratorio',
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
    await laboratoryTestApi.remove(target.id)
    void listBody.value?.reload()
    deleting.value = null
    toast.info('Registro eliminado', 'El registro fue removido.')
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo eliminar')
    error.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    deletingBusy.value = false
  }
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Acciones clínicas"
      title="Solicitudes de laboratorio"
      lead="Crea y consulta solicitudes de examen sin pasar por una consulta."
    >
      <template #action>
        <button
          v-if="canCreate && selection"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          @click="modalOpen = true"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nueva solicitud
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
        placeholder="Buscar tipo o diagnóstico…"
        empty-text="Este paciente aún no tiene solicitudes de laboratorio."
      >
        <template #header>
          <tr>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Cantidad</th>
            <th>Diagnóstico</th>
            <th>Estado</th>
            <th v-if="canUpdate || canDelete" class="ds-col-actions">Acciones</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr class="ds-row-clickable clickable-row" @click="onRowClick(item)">
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ item.testType.name }}</td>
            <td>{{ item.quantity }}</td>
            <td class="ellipsis ds-truncate">{{ item.diagnosis }}</td>
            <td><LabStatusPill :status="item.status" /></td>
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

    <LabFormModal
      :open="modalOpen || editing !== null"
      :pre-selected-animal="selection?.animal ?? null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <ConfirmDeleteDialog
      :open="deleting !== null"
      title="Eliminar examen"
      :message="
        deleting
          ? `Se eliminará la solicitud de ${deleting.testType.name}. Esta acción no se puede deshacer.`
          : ''
      "
      :busy="deletingBusy"
      @cancel="deleting = null"
      @confirm="onConfirmDelete"
    />

    <AccionDetailModal
      :open="viewing !== null"
      title="Detalle del examen"
      :icon="Beaker"
      :fields="viewing ? detailFields(viewing) : []"
      :can-edit="canUpdate"
      @close="closeViewing"
      @edit="editFromViewing"
    >
      <!-- Adjuntos de resultado (ver / descargar) si el examen ya tiene documento. -->
      <LabResultAttachments v-if="viewing" :key="viewing.id" :test-id="viewing.id" />
    </AccionDetailModal>
  </div>
</template>

<style scoped>
/* El recorte lo pone `.ds-truncate`; aquí solo el ancho de esta columna. */
.ellipsis {
  max-width: 280px;
}
</style>

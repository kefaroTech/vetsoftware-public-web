<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { emptyPage } from '@/types/pagination'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-vue-next'
import ListBody from '../components/ListBody.vue'
import PatientCascadePicker from '../components/PatientCascadePicker.vue'
import OwnerAnimalBreadcrumb from '../components/OwnerAnimalBreadcrumb.vue'
import SpaFormModal from '../modals/SpaFormModal.vue'
import AccionDetailModal, { type DetailFieldDef } from '../modals/AccionDetailModal.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { openBilling } from '@/features/cuentas/composables/useBillingPrompt'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import { spaApi } from '@/features/dashboard/views/consulta/nueva/api/spa.api'
import type { SpaResponse } from '@/features/dashboard/views/consulta/nueva/types/spa.types'
import type { AnimalResponse } from '@/features/dashboard/views/consulta/nueva/types/animal.types'
import type { Owner } from '@/types/domain'
import { formatDateShort } from '@/composables/format'
import { getProblemDetailMessage } from '@/services/http/http.client'
const { can } = useAuthorization()
const toast = useToast()
const { confirm } = useConfirmDialog()
const canCreate = can(PERMISSIONS.SPA_CREATE)
const canUpdate = can(PERMISSIONS.SPA_UPDATE)
const canDelete = can(PERMISSIONS.SPA_DELETE)

const selection = ref<{ owner: Owner; animal: AnimalResponse } | null>(null)
const patientId = ref<number | null>(null)
const listBody = useTemplateRef<{ reload: () => Promise<void> }>('listBody')
const error = ref<string | null>(null)
const modalOpen = ref(false)
const editing = ref<SpaResponse | null>(null)
const viewing = ref<SpaResponse | null>(null)

function detailFields(item: SpaResponse): DetailFieldDef[] {
  return [
    { label: 'Fecha', value: formatDateShort(item.date) },
    { label: 'Tipo de servicio', value: item.spaType.name },
    { label: 'Motivo', value: item.reason, span: 'full' },
    { label: 'Detalles del servicio', value: item.details, span: 'full' },
    { label: 'Observaciones', value: item.observations, span: 'full' },
  ]
}

function onRowClick(item: SpaResponse) {
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
  if (!animalId) return Promise.resolve(emptyPage<SpaResponse>(pageSize))
  return spaApi.listByAnimal(animalId, query, page, pageSize, signal)
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
    'Servicio guardado',
    wasEdit ? 'Los cambios se guardaron.' : 'Se añadió correctamente al paciente.',
  )
  if (!wasEdit && selection.value) {
    openBilling({
      ownerId: Number(selection.value.owner.id),
      ownerName: selection.value.owner.name,
      animalId: selection.value.animal.id,
      animalName: selection.value.animal.name,
      heading: 'Facturación · Spa',
    })
  }
}

function onFormClose() {
  modalOpen.value = false
  editing.value = null
}

/**
 * El diálogo de confirmación es el único de la app (`AppConfirmDialog`, montado
 * en `App.vue`): se pide con `confirm()` y la acción viaja dentro. Mientras el
 * DELETE está en vuelo el diálogo sigue abierto y con los botones inertes, así
 * que ni el doble clic ni una segunda pulsación en la fila lo repiten —que es
 * lo que antes sostenía el `:busy` de `ConfirmDeleteDialog`.
 */
async function requestDelete(target: SpaResponse) {
  error.value = null
  try {
    const ok = await confirm({
      title: 'Eliminar servicio de spa',
      message: `Se eliminará el servicio ${target.spaType.name}.`,
      consequence: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      busyLabel: 'Eliminando…',
      action: () => spaApi.remove(target.id),
    })
    if (!ok) return
    void listBody.value?.reload()
    toast.info('Registro eliminado', 'El registro fue removido.')
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo eliminar')
    error.value = msg
    toast.error('Ocurrió un error', msg)
  }
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Acciones clínicas"
      title="Spa"
      lead="Servicios de baño, estética e higiene independientes de una consulta."
    >
      <template #action>
        <button
          v-if="canCreate && selection"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          @click="modalOpen = true"
        >
          <Plus :size="16" :stroke-width="1.8" /> Nuevo servicio
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
        placeholder="Buscar servicio, motivo o detalles…"
        empty-text="Este paciente aún no tiene servicios de spa registrados."
        table-label="Spa"
      >
        <template #header>
          <tr>
            <th>Fecha</th>
            <th>Servicio</th>
            <th>Motivo</th>
            <th>Detalles</th>
            <th v-if="canUpdate || canDelete" class="ds-col-actions">Acciones</th>
          </tr>
        </template>
        <template #row="{ item }">
          <tr class="ds-row-clickable clickable-row" @click="onRowClick(item)">
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ item.spaType.name }}</td>
            <td class="truncate ds-truncate">{{ item.reason || '—' }}</td>
            <td class="truncate ds-truncate">{{ item.details || '—' }}</td>
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
                @click.stop="requestDelete(item)"
              >
                <Trash2 :size="15" :stroke-width="1.7" />
              </button>
            </td>
          </tr>
        </template>
      </ListBody>
    </template>

    <SpaFormModal
      :open="modalOpen || editing !== null"
      :pre-selected-animal="selection?.animal ?? null"
      :initial="editing"
      @close="onFormClose"
      @saved="onSaved"
    />

    <AccionDetailModal
      :open="viewing !== null"
      title="Detalle del servicio de spa"
      :icon="Sparkles"
      :fields="viewing ? detailFields(viewing) : []"
      :can-edit="canUpdate"
      @close="closeViewing"
      @edit="editFromViewing"
    />
  </div>
</template>

<style scoped>
/* El recorte lo pone `.ds-truncate`; aquí solo el ancho de esta columna. */
.truncate {
  max-width: 240px;
}
</style>

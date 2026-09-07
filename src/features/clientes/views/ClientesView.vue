<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Plus } from 'lucide-vue-next'
import type { Owner } from '@/types/domain'
import { useOwners } from '../composables/useOwners'
import ClientesTable from '../components/ClientesTable.vue'
import ClienteDrawer from '../components/ClienteDrawer.vue'
import OwnerFormModal from '../components/OwnerFormModal.vue'
import type {
  CreateOwnerRequest,
  UpdateOwnerRequest,
} from '@/features/dashboard/views/consulta/nueva/types/owner.types'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { PERMISSIONS } from '@/constants/permissions'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { getProblemDetailMessage } from '@/services/http/http.client'

const {
  owners,
  loading,
  error,
  page,
  pageSize,
  totalElements,
  totalPages,
  search,
  setQuery,
  setPage,
  refresh,
  reset,
  create,
  update,
  remove,
} = useOwners()

const { can } = useAuthorization()
const toast = useToast()
const { confirm } = useConfirmDialog()
const canCreate = can(PERMISSIONS.OWNER_CREATE)
const canUpdate = can(PERMISSIONS.OWNER_UPDATE)
const canDelete = can(PERMISSIONS.OWNER_DELETE)
const canCreatePet = can(PERMISSIONS.ANIMAL_CREATE)
const canUpdatePet = can(PERMISSIONS.ANIMAL_UPDATE)
const canDeletePet = can(PERMISSIONS.ANIMAL_DELETE)

const query = ref('')
const SEARCH_DEBOUNCE_MS = 300
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, (q) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void setQuery(q)
  }, SEARCH_DEBOUNCE_MS)
})
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

const selectedId = ref<string | null>(null)
const formOpen = ref(false)
const editingOwnerId = ref<number | null>(null)
const busy = ref(false)
const submitError = ref<string | null>(null)

const selected = computed<Owner | null>(
  () => owners.value.find((o) => o.id === selectedId.value) ?? null,
)

onMounted(() => {
  query.value = ''
  reset()
  search().catch(() => {
    /* error ya queda en error.value */
  })
})

function onSelect(id: string) {
  selectedId.value = id
}

function closeDrawer() {
  selectedId.value = null
}

function openCreate() {
  editingOwnerId.value = null
  submitError.value = null
  formOpen.value = true
}

function openEdit(owner: Owner) {
  editingOwnerId.value = Number(owner.id)
  submitError.value = null
  formOpen.value = true
}

async function handleSubmit(payload: {
  id: number | null
  body: CreateOwnerRequest | UpdateOwnerRequest
}) {
  if (busy.value) return
  busy.value = true
  submitError.value = null
  try {
    if (payload.id != null) {
      const updated = await update(payload.id, payload.body)
      selectedId.value = updated.id
      toast.success('Cliente actualizado', updated.name)
    } else {
      const created = await create(payload.body)
      selectedId.value = created.id
      toast.success('Cliente creado', created.name)
    }
    formOpen.value = false
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo guardar el cliente')
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
  } finally {
    busy.value = false
  }
}

async function askDelete(owner: Owner) {
  if (busy.value) return
  try {
    const ok = await confirm({
      title: `¿Eliminar a ${owner.name.split(' ')[0]}?`,
      message:
        'Se eliminará el registro del cliente. Sus mascotas y su historia clínica no se ven afectadas.',
      confirmLabel: 'Eliminar',
      busyLabel: 'Eliminando…',
      accent: 'danger',
      action: async () => {
        busy.value = true
        try {
          await remove(Number(owner.id))
        } finally {
          busy.value = false
        }
      },
    })
    if (!ok) return
    closeDrawer()
    toast.info('Cliente eliminado', `${owner.name} se eliminó correctamente.`)
  } catch (e) {
    const msg = getProblemDetailMessage(e, 'No se pudo eliminar al cliente')
    submitError.value = msg
    toast.error('Ocurrió un error', msg)
    await refresh().catch(() => undefined)
  }
}
</script>

<template>
  <div class="ds-page">
    <PageHeader
      kicker="Clientes"
      title="Clientes y mascotas"
      lead="Registra y consulta los propietarios de tu clínica y sus mascotas."
    >
      <template #action>
        <button
          v-if="canCreate"
          type="button"
          class="ds-btn ds-btn--primary ds-btn--lg ds-btn--elevated"
          :disabled="busy"
          @click="openCreate"
        >
          <Plus :size="16" :stroke-width="1.8" />
          Nuevo cliente
        </button>
      </template>
    </PageHeader>

    <div v-if="submitError" class="ds-banner ds-banner--error" role="alert">
      {{ submitError }}
    </div>

    <ClientesTable
      :owners="owners"
      :error="error"
      :selected-id="selectedId"
      :query="query"
      :loading="loading"
      :page="page"
      :page-size="pageSize"
      :total-elements="totalElements"
      :total-pages="totalPages"
      @update:query="query = $event"
      @update:page="setPage"
      @select="onSelect"
    />

    <ClienteDrawer
      :owner="selected"
      :busy="busy"
      :can-update="canUpdate"
      :can-create="canCreate"
      :can-delete="canDelete"
      :can-create-pet="canCreatePet"
      :can-update-pet="canUpdatePet"
      :can-delete-pet="canDeletePet"
      @close="closeDrawer"
      @edit="openEdit"
      @delete="askDelete"
    />

    <OwnerFormModal
      :open="formOpen"
      :owner-id="editingOwnerId"
      :busy="busy"
      @close="formOpen = false"
      @save="handleSubmit"
    />
  </div>
</template>

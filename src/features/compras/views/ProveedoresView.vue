<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Truck, Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import { useSuppliers } from '../composables/useSuppliers'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { PERMISSIONS } from '@/constants/permissions'
import SupplierModal from '../components/SupplierModal.vue'
import ComprasIconButton from '../components/ComprasIconButton.vue'
import ComprasTable from '../components/ComprasTable.vue'
import type { Supplier } from '../types/compras'

const { items, total, loading, error, search, remove } = useSuppliers()
const { can } = useAuthorization()
const toast = useToast()
const { confirm } = useConfirmDialog()

const canCreate = can(PERMISSIONS.SUPPLIER_CREATE)
const canUpdate = can(PERMISSIONS.SUPPLIER_UPDATE)
const canDelete = can(PERMISSIONS.SUPPLIER_DELETE)

const q = ref('')
const modalOpen = ref(false)
const editing = ref<Supplier | null>(null)

let debounce: ReturnType<typeof setTimeout> | undefined
function onSearch() {
  clearTimeout(debounce)
  debounce = setTimeout(
    () => void search({ q: q.value.trim() || undefined, page: 0, pageSize: 50 }),
    300,
  )
}

function refresh() {
  void search({ q: q.value.trim() || undefined, page: 0, pageSize: 50 })
}

function openCreate() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(s: Supplier) {
  editing.value = s
  modalOpen.value = true
}

/**
 * El `window.confirm()` nativo que había aquí no tenía foco gobernado, ni
 * estilo, ni rótulos en español, ni guarda de doble clic. Ahora pasa por el
 * único diálogo de la app, con la acción dentro.
 */
async function onDelete(s: Supplier) {
  try {
    const ok = await confirm({
      title: 'Eliminar proveedor',
      message: `Se eliminará el proveedor ${s.name}.`,
      consequence: 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar proveedor',
      busyLabel: 'Eliminando…',
      action: () => remove(s.id),
    })
    if (!ok) return
    toast.success('Proveedor eliminado')
    refresh()
  } catch (e) {
    toast.errorFrom('No se pudo eliminar', e, 'Error al eliminar el proveedor')
  }
}

onMounted(refresh)
</script>

<template>
  <div class="ds-page ds-page--contained">
    <header class="page-head">
      <div class="ds-flex-row ds-flex-row--12 ds-flex-row--accent">
        <Truck :size="22" :stroke-width="1.7" />
        <div>
          <h1 class="ds-display ds-display--xs">Proveedores</h1>
          <p class="ds-view-subtitle">Terceros a los que le compras bienes o servicios</p>
        </div>
      </div>
      <button
        v-if="canCreate"
        type="button"
        class="ds-btn ds-btn--solid ds-btn--strong"
        @click="openCreate"
      >
        <Plus :size="16" :stroke-width="1.9" /> Nuevo proveedor
      </button>
    </header>

    <div class="search-bar ds-flex-row">
      <Search :size="16" :stroke-width="1.7" />
      <input
        v-model="q"
        type="text"
        placeholder="Buscar por nombre, NIT o contacto…"
        @input="onSearch"
      />
    </div>

    <p v-if="error" class="ds-server-error">{{ error }}</p>

    <ComprasTable>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>NIT</th>
          <th>Contacto</th>
          <th>Teléfono</th>
          <th>Correo</th>
          <th class="ds-num">Crédito</th>
          <th class="actions-col"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!loading && items.length === 0">
          <td colspan="7" class="ds-empty ds-empty--md">No hay proveedores registrados.</td>
        </tr>
        <tr v-for="s in items" :key="s.id">
          <td class="ds-strong">{{ s.name }}</td>
          <td>{{ s.taxId ?? '—' }}</td>
          <td>{{ s.contactName ?? '—' }}</td>
          <td>{{ s.phone ?? '—' }}</td>
          <td>{{ s.email ?? '—' }}</td>
          <td class="ds-num">
            {{ s.paymentTermsDays != null ? s.paymentTermsDays + ' días' : '—' }}
          </td>
          <td class="ds-actions">
            <ComprasIconButton v-if="canUpdate" title="Editar" row @click="openEdit(s)">
              <Pencil :size="15" :stroke-width="1.7" />
            </ComprasIconButton>
            <ComprasIconButton
              v-if="canDelete"
              title="Eliminar"
              row
              tone="danger"
              @click="onDelete(s)"
            >
              <Trash2 :size="15" :stroke-width="1.7" />
            </ComprasIconButton>
          </td>
        </tr>
      </tbody>
    </ComprasTable>
    <p class="count ds-meta">{{ total }} proveedor(es)</p>

    <SupplierModal
      :open="modalOpen"
      :supplier="editing"
      @close="modalOpen = false"
      @saved="refresh"
    />
  </div>
</template>

<style scoped>
/* Primitivas: `.ds-flex-row--12 --accent` + `--display--xs` + `--view-subtitle`
   (cabecera), `.ds-flex-row` (búsqueda), `.ds-num`, `.ds-strong`, `.ds-meta` y
   `.ds-empty --md` (fila vacía; padding/color los pisa `.grid-table td`). */
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.search-bar {
  padding: 9px 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-450);
  border-radius: 10px;
  margin-bottom: 16px;
  color: var(--warm-500);
}

.search-bar input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 14px;
  color: var(--warm-900);
  outline: none;
}

/* La tabla y su cabecera/celda viven en `ComprasTable.vue`, compartida por las
   tres vistas de la feature. */

.actions-col {
  width: 90px;
}

.count {
  margin-top: 10px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>

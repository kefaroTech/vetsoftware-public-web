<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Truck, Plus, Pencil, Trash2, Search } from 'lucide-vue-next'
import { useSuppliers } from '../composables/useSuppliers'
import { useAuthorization } from '@/features/auth/composables/useAuthorization'
import { useToast } from '@/composables/useToast'
import { PERMISSIONS } from '@/constants/permissions'
import SupplierModal from '../components/SupplierModal.vue'
import type { Supplier } from '../types/compras'

const { items, total, loading, error, search, remove } = useSuppliers()
const { can } = useAuthorization()
const toast = useToast()

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

async function onDelete(s: Supplier) {
  if (!window.confirm(`¿Eliminar el proveedor "${s.name}"?`)) return
  try {
    await remove(s.id)
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

    <table class="grid-table">
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
            <button
              v-if="canUpdate"
              type="button"
              class="icon-btn"
              title="Editar"
              @click="openEdit(s)"
            >
              <Pencil :size="15" :stroke-width="1.7" />
            </button>
            <button
              v-if="canDelete"
              type="button"
              class="icon-btn danger"
              title="Eliminar"
              @click="onDelete(s)"
            >
              <Trash2 :size="15" :stroke-width="1.7" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
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
  border: 1px solid var(--warm-200);
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

.grid-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.grid-table th {
  text-align: left;
  color: var(--warm-500);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 8px;
  border-bottom: 1px solid var(--warm-200);
}

.grid-table td {
  padding: 9px 8px;
  border-bottom: 1px solid var(--warm-100);
  color: var(--warm-700);
}

.actions-col {
  width: 90px;
}

.icon-btn {
  border: none;
  background: var(--warm-100);
  color: var(--warm-600);
  border-radius: 7px;
  padding: 6px;
  cursor: pointer;
  display: inline-flex;
}

.icon-btn:hover {
  background: var(--warm-200);
}

.icon-btn.danger:hover {
  background: var(--danger-200);
  color: oklch(50% 0.2 25deg);
}

.count {
  margin-top: 10px;
}

/* caja/compras usan un amatista un punto más claro que el resto. */
.ds-btn--solid {
  --ds-btn-solid-bg: var(--amatista-600);
}
</style>

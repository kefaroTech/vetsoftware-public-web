<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import EmpleadoRow from './EmpleadoRow.vue'
import Pagination from '@/components/ui/Pagination.vue'

// La búsqueda es server-side: no filtramos localmente, renderizamos la página que llega del backend.
defineProps<{
  employees: Employee[]
  selectedId: number | null
  query: string
  loading?: boolean
  page: number
  pageSize: number
  totalElements: number
  totalPages: number
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  'update:page': [value: number]
  select: [id: number]
}>()
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="search ds-flex-row">
        <Search :size="15" :stroke-width="1.7" class="ic" />
        <input
          class="ds-flex-fill"
          :value="query"
          type="search"
          placeholder="Buscar por nombre, código o correo…"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="table ds-stack">
      <div class="head">
        <div class="cell avatar-cell" />
        <div class="cell name-cell">Empleado</div>
        <div class="cell role-cell">Rol</div>
        <div class="cell sedes-cell">Sedes</div>
        <div class="cell contact-cell">Correo</div>
        <div class="cell status-cell">Estado</div>
        <div class="cell chev-cell" />
      </div>

      <div v-if="loading && employees.length === 0" class="empty ds-empty">Cargando empleados…</div>
      <div v-else-if="employees.length === 0" class="empty ds-empty">
        {{
          query.trim()
            ? 'Sin resultados que coincidan con la búsqueda.'
            : 'Aún no hay empleados registrados en esta empresa.'
        }}
      </div>

      <EmpleadoRow
        v-for="(emp, i) in employees"
        :key="emp.id"
        :employee="emp"
        :selected="emp.id === selectedId"
        :zebra="i % 2 !== 0"
        @select="emit('select', $event)"
      />
    </div>

    <Pagination
      :page="page"
      :page-count="totalPages"
      :total="totalElements"
      :page-size="pageSize"
      @update:page="emit('update:page', $event)"
    />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  margin-bottom: 14px;
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 10px;
}

.search {
  flex: 1;
  padding: 6px 12px;
  background: var(--warm-100);
  border-radius: 7px;
}

.search .ic {
  color: var(--warm-500);
}

.search input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  color: var(--warm-900);
  font-family: inherit;
}

.search input::placeholder {
  color: var(--warm-500);
}

.table {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
}

.head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: var(--warm-100);
  border-bottom: 1px solid var(--warm-200);
  font-size: 11.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--warm-500);
  font-weight: 500;
}

.cell {
  min-width: 0;
}

.avatar-cell {
  flex: 0 0 36px;
}

.name-cell {
  flex: 1.8;
}

.role-cell {
  flex: 1.2;
}

.sedes-cell {
  flex: 1.4;
}

.contact-cell {
  flex: 1.4;
}

.status-cell {
  flex: 0 0 96px;
}

.chev-cell {
  flex: 0 0 28px;
}

.empty {
  padding: 60px 20px;
  font-size: 14px;
}
</style>

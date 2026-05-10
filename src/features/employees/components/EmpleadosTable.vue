<script setup lang="ts">
import { computed } from 'vue'
import { Search } from 'lucide-vue-next'
import type { Employee } from '@/types/domain'
import EmpleadoRow from './EmpleadoRow.vue'

const props = defineProps<{
  employees: Employee[]
  selectedId: number | null
  query: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  select: [id: number]
}>()

const filtered = computed(() => {
  const q = props.query.trim().toLowerCase()
  if (!q) return props.employees
  return props.employees.filter((e) => {
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    )
  })
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="search">
        <Search :size="15" :stroke-width="1.7" class="ic" />
        <input
          :value="query"
          type="search"
          placeholder="Buscar por nombre, código o correo…"
          @input="emit('update:query', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div class="table">
      <div class="head">
        <div class="cell avatar-cell" />
        <div class="cell name-cell">Empleado</div>
        <div class="cell role-cell">Rol</div>
        <div class="cell contact-cell">Correo</div>
        <div class="cell status-cell">Estado</div>
        <div class="cell chev-cell" />
      </div>

      <div v-if="loading && employees.length === 0" class="empty">Cargando empleados…</div>
      <div v-else-if="filtered.length === 0" class="empty">
        {{
          employees.length === 0
            ? 'Aún no hay empleados registrados en esta empresa.'
            : 'Sin resultados que coincidan con la búsqueda.'
        }}
      </div>

      <EmpleadoRow
        v-for="(emp, i) in filtered"
        :key="emp.id"
        :employee="emp"
        :selected="emp.id === selectedId"
        :zebra="i % 2 !== 0"
        @select="emit('select', $event)"
      />
    </div>
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--warm-100);
  border-radius: 7px;
}
.search .ic {
  color: var(--warm-500);
}
.search input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 13.5px;
  color: var(--warm-900);
  font-family: inherit;
  min-width: 0;
}
.search input::placeholder {
  color: var(--warm-500);
}

.table {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  flex: 2;
}
.role-cell {
  flex: 1.4;
}
.contact-cell {
  flex: 1.6;
}
.status-cell {
  flex: 0 0 100px;
}
.chev-cell {
  flex: 0 0 28px;
}
.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--warm-500);
  font-size: 14px;
}
</style>

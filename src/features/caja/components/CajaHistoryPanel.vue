<script setup lang="ts">
import { FileDown, Filter, History, RotateCcw } from 'lucide-vue-next'
import DateInput from '@/features/dashboard/components/ui/DateInput.vue'
import Pagination from '@/features/acciones/components/Pagination.vue'
import {
  branchLabel,
  employeeLabel,
  formatDateTime,
  formatDuration,
  formatMoney,
} from '../composables/useCaja'
import type { CashSessionView } from '../types/caja'

/**
 * Pestaña de historial de cajas: filtros, tabla paginada y descarga de arqueos.
 *
 * Sale de `CajaView` porque era su bloque más grande: 147 líneas de marcado y
 * 66 de CSS propio. La base de tabla (`.movs`, `.num`, `.empty-row`…) se copia
 * aquí a propósito — las otras dos pestañas la siguen usando y el CSS scoped no
 * cruza fronteras de componente.
 */
defineProps<{
  rows: CashSessionView[]
  total: number
  page: number
  pageCount: number
  pageSize: number
  loading: boolean
  employeesLoading: boolean
  branchOptions: { id: number; name: string; active: boolean }[]
  employeeOptions: { id: number; name: string; enabled: boolean }[]
}>()

const emit = defineEmits<{
  apply: []
  clear: []
  export: [id: number, format: 'csv' | 'pdf']
  'update:page': [page: number]
}>()

const branchId = defineModel<number | null>('branchId', { required: true })
const employeeId = defineModel<number | null>('employeeId', { required: true })
const from = defineModel<string>('from', { required: true })
const to = defineModel<string>('to', { required: true })
</script>

<template>
  <section class="history">
    <div class="history-head">
      <h2 class="section-title"><History :size="16" :stroke-width="1.7" /> Historial de cajas</h2>
      <span class="history-count">{{ total }} {{ total === 1 ? 'sesión' : 'sesiones' }}</span>
    </div>
    <form class="history-filters" @submit.prevent="emit('apply')">
      <label class="filter-field">
        <span>Sede</span>
        <select v-model="branchId" :disabled="loading">
          <option :value="null">Todas las sedes asignadas</option>
          <option v-for="branch in branchOptions" :key="branch.id" :value="branch.id">
            {{ branch.name }}{{ branch.active ? '' : ' (inactiva)' }}
          </option>
        </select>
      </label>
      <label class="filter-field">
        <span>Empleado que abrió</span>
        <select v-model="employeeId" :disabled="loading || employeesLoading">
          <option :value="null">
            {{ employeesLoading ? 'Cargando empleados…' : 'Todos los empleados' }}
          </option>
          <option v-for="employee in employeeOptions" :key="employee.id" :value="employee.id">
            {{ employee.name }}{{ employee.enabled ? '' : ' (inactivo)' }}
          </option>
        </select>
      </label>
      <label class="filter-field date-field">
        <span>Desde</span>
        <DateInput
          id="cash-history-from"
          v-model="from"
          placeholder="Fecha inicial"
          :max="to || undefined"
          :disabled="loading"
        />
      </label>
      <label class="filter-field date-field">
        <span>Hasta</span>
        <DateInput
          id="cash-history-to"
          v-model="to"
          placeholder="Fecha final"
          :min="from || undefined"
          :disabled="loading"
        />
      </label>
      <div class="filter-actions">
        <button type="submit" class="ds-btn ds-btn--solid ds-btn--strong" :disabled="loading">
          <Filter :size="14" :stroke-width="1.8" /> Filtrar
        </button>
        <button
          type="button"
          class="ds-btn ds-btn--neutral ds-btn--strong"
          :disabled="loading"
          @click="emit('clear')"
        >
          <RotateCcw :size="14" :stroke-width="1.8" /> Limpiar
        </button>
      </div>
    </form>
    <div class="table-scroll">
      <table class="movs history-table">
        <thead>
          <tr>
            <th>Sede</th>
            <th>Apertura</th>
            <th>Cierre</th>
            <th>Duración</th>
            <th>Terminal</th>
            <th>Abrió</th>
            <th>Cerró</th>
            <th>Estado</th>
            <th class="num">Base</th>
            <th class="num">Total cierre</th>
            <th class="num">Arqueo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="11" class="empty-row">Cargando historial…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td colspan="11" class="empty-row">Sin sesiones registradas.</td>
          </tr>
          <tr v-for="s in rows" v-else :key="s.id">
            <td class="branch-name">{{ branchLabel(s.branchName, s.branchId) }}</td>
            <td>{{ formatDateTime(s.openedAt) }}</td>
            <td>{{ s.closedAt ? formatDateTime(s.closedAt) : '—' }}</td>
            <td class="duration">{{ formatDuration(s.openedAt, s.closedAt) }}</td>
            <td>{{ s.terminal }}</td>
            <td class="employee">
              {{ employeeLabel(s.openedByEmployeeName, s.openedByEmployeeId) }}
            </td>
            <td class="employee">
              {{ employeeLabel(s.closedByEmployeeName, s.closedByEmployeeId) }}
            </td>
            <td>
              <span class="pill" :class="s.status === 'OPEN' ? 'open' : 'closed'">
                {{ s.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
              </span>
            </td>
            <td class="num">{{ formatMoney(s.openingFloat) }}</td>
            <td class="num">
              {{ s.closingTotal == null ? '—' : formatMoney(s.closingTotal) }}
            </td>
            <td class="num actions-cell">
              <button
                type="button"
                class="link"
                :aria-label="'Descargar arqueo CSV de la sesión ' + s.id"
                title="Descargar CSV"
                @click="emit('export', s.id, 'csv')"
              >
                CSV
              </button>
              <button
                type="button"
                class="link"
                :aria-label="'Descargar arqueo PDF de la sesión ' + s.id"
                title="Descargar PDF"
                @click="emit('export', s.id, 'pdf')"
              >
                <FileDown :size="13" :stroke-width="1.8" /> PDF
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <Pagination
      :page="page"
      :page-count="pageCount"
      :total="total"
      :page-size="pageSize"
      @update:page="emit('update:page', $event)"
    />
  </section>
</template>

<style scoped>
.filter-field > span {
  color: var(--warm-500);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.filter-field select:focus {
  border-color: var(--amatista-500, #76519d);
  box-shadow: 0 0 0 3px rgb(92 45 140 / 10%);
}

.filter-field select:disabled {
  cursor: wait;
  opacity: 0.65;
}

.date-field :deep(.date-wrap) {
  min-width: 0;
}

.actions-cell {
  white-space: nowrap;
}

.history {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 16px;
  padding: 20px 22px;
}

.history-filters {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(190px, 1.2fr) 170px 170px auto;
  align-items: end;
  gap: 10px;
  margin: 12px 0 16px;
  padding: 14px;
  border: 1px solid var(--warm-200);
  border-radius: 12px;
  background: var(--warm-100);
}

.filter-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.filter-field select {
  width: 100%;
  height: 38px;
  padding: 0 32px 0 11px;
  border: 1px solid var(--warm-200);
  border-radius: 8px;
  outline: none;
  background: var(--warm-50);
  color: var(--warm-800);
  font: inherit;
  font-size: 12.5px;
}

.filter-actions {
  display: flex;
  gap: 7px;
}

.history-table {
  min-width: 1180px;
}

@media (width <= 1100px) {
  .history-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@media (width <= 720px) {
  .history {
    padding: 16px;
  }

  .history-filters {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    grid-column: auto;
    flex-wrap: wrap;
  }
}

/* --- base de tabla compartida con las otras pestañas --- */

.branch-name {
  color: var(--warm-800);
  font-weight: 600;
  white-space: nowrap;
}

.pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
  font-weight: 600;
}

.pill.open {
  background: oklch(92% 0.08 150deg);
  color: oklch(40% 0.12 150deg);
}

.pill.closed {
  background: var(--warm-100);
  color: var(--warm-600);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 400;
  color: var(--warm-800);
  margin: 8px 0 10px;
}

.movs {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.movs th {
  text-align: left;
  color: var(--warm-500);
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 6px 8px;
  border-bottom: 1px solid var(--warm-200);
}

.movs td {
  padding: 7px 8px;
  border-bottom: 1px solid var(--warm-100);
}

.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.empty-row {
  text-align: center;
  color: var(--warm-400);
  padding: 22px;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.history-count {
  color: var(--warm-500);
  font-size: 12px;
}

.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.duration {
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}

.employee {
  color: var(--warm-600);
  font-size: 12px;
}

.actions-cell {
  white-space: nowrap;
}

.link {
  background: none;
  border: none;
  color: var(--amatista-700);
  font-weight: 600;
  font-size: 12.5px;
  cursor: pointer;
  padding: 2px 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.link:hover {
  text-decoration: underline;
}
</style>

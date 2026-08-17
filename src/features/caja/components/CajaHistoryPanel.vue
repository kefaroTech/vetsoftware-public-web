<script setup lang="ts">
import { FileDown, Filter, History, RotateCcw } from 'lucide-vue-next'
import DateInput from '@/components/ui/DateInput.vue'
import Pagination from '@/components/ui/Pagination.vue'
import CajaPanel from './CajaPanel.vue'
import CashLinkButton from './CashLinkButton.vue'
import CashStatusPill from './CashStatusPill.vue'
import CashTable from './CashTable.vue'
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
 * 66 de CSS propio. La tarjeta, el armazón de la tabla, el distintivo de estado
 * y las acciones en texto viven ahora en componentes del feature, así que aquí
 * sólo queda lo propio de esta pestaña: la rejilla de filtros y las columnas.
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
  <CajaPanel title="Historial de cajas" :icon="History">
    <template #count>{{ total }} {{ total === 1 ? 'sesión' : 'sesiones' }}</template>

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
    <CashTable :min-width="1180">
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
            <CashStatusPill :status="s.status" />
          </td>
          <td class="num">{{ formatMoney(s.openingFloat) }}</td>
          <td class="num">
            {{ s.closingTotal == null ? '—' : formatMoney(s.closingTotal) }}
          </td>
          <td class="num actions-cell">
            <CashLinkButton
              :aria-label="'Descargar arqueo CSV de la sesión ' + s.id"
              title="Descargar CSV"
              @click="emit('export', s.id, 'csv')"
            >
              CSV
            </CashLinkButton>
            <CashLinkButton
              :aria-label="'Descargar arqueo PDF de la sesión ' + s.id"
              title="Descargar PDF"
              @click="emit('export', s.id, 'pdf')"
            >
              <FileDown :size="13" :stroke-width="1.8" /> PDF
            </CashLinkButton>
          </td>
        </tr>
      </tbody>
    </CashTable>
    <Pagination
      :page="page"
      :page-count="pageCount"
      :total="total"
      :page-size="pageSize"
      @update:page="emit('update:page', $event)"
    />
  </CajaPanel>
</template>

<style scoped>
.filter-field > span {
  color: var(--warm-500);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Anillo propio, más oscuro que el `--ring` del sistema: no es `.ds-focus-ring`.
   Ver informe FE-08 del slice de caja. */
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

@media (width <= 1100px) {
  .history-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-actions {
    grid-column: 1 / -1;
  }
}

@media (width <= 720px) {
  .history-filters {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    grid-column: auto;
    flex-wrap: wrap;
  }
}
</style>

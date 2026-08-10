<script setup lang="ts">
import {
  branchLabel,
  employeeLabel,
  formatDateTime,
  formatDuration,
  formatMoney,
} from '../composables/useCaja'
import type { CashSessionView } from '../types/caja'

/**
 * Pestaña "Cajas abiertas": tabla de las sesiones OPEN visibles para el usuario.
 *
 * Sale de `CajaView` junto con las otras dos pestañas. Los formateadores se
 * importan del composable en vez de recibirse por prop, como hacía la primera
 * versión de `CajaHistoryPanel`: son funciones puras sin estado.
 */
defineProps<{
  sessions: CashSessionView[]
  loading: boolean
  myOpenSessionId: number | null
}>()

const emit = defineEmits<{ open: [session: CashSessionView] }>()
</script>

<template>
  <section class="open-overview">
    <div class="history-head">
      <h2 class="section-title">Cajas abiertas visibles</h2>
      <span class="history-count">
        {{ sessions.length }}
        {{ sessions.length === 1 ? 'caja abierta' : 'cajas abiertas' }}
      </span>
    </div>
    <div class="table-scroll">
      <table class="movs open-table">
        <thead>
          <tr>
            <th>Sede</th>
            <th>Terminal</th>
            <th>Apertura</th>
            <th>Duración</th>
            <th>Abrió</th>
            <th class="num">Base</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="empty-row">Cargando cajas abiertas…</td>
          </tr>
          <tr v-else-if="sessions.length === 0">
            <td colspan="7" class="empty-row">No hay cajas abiertas en las sedes visibles.</td>
          </tr>
          <tr v-for="session in sessions" v-else :key="session.id">
            <td class="branch-name">{{ branchLabel(session.branchName, session.branchId) }}</td>
            <td>{{ session.terminal }}</td>
            <td>{{ formatDateTime(session.openedAt) }}</td>
            <td class="duration">{{ formatDuration(session.openedAt, null) }}</td>
            <td class="employee">
              {{ employeeLabel(session.openedByEmployeeName, session.openedByEmployeeId) }}
            </td>
            <td class="num">{{ formatMoney(session.openingFloat) }}</td>
            <td>
              <button type="button" class="link" @click="emit('open', session)">
                {{ session.id === myOpenSessionId ? 'Ver mi caja' : 'Ver caja' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.open-overview {
  background: var(--warm-50);
  border: 1px solid var(--warm-200);
  border-radius: 16px;
  padding: 18px 22px;
  margin-bottom: 20px;
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

.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.open-table {
  min-width: 850px;
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

.branch-name {
  color: var(--warm-800);
  font-weight: 600;
  white-space: nowrap;
}

.duration,
.employee {
  white-space: nowrap;
}

.duration {
  color: var(--warm-600);
  font-variant-numeric: tabular-nums;
}

.employee {
  color: var(--warm-600);
  font-size: 12px;
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

@media (width <= 720px) {
  .open-overview {
    padding: 16px;
  }
}
</style>

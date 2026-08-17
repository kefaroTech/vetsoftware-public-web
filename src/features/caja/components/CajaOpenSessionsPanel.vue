<script setup lang="ts">
import CajaPanel from './CajaPanel.vue'
import CashLinkButton from './CashLinkButton.vue'
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
  <CajaPanel class="open-overview" title="Cajas abiertas visibles" tight>
    <template #count>
      {{ sessions.length }}
      {{ sessions.length === 1 ? 'caja abierta' : 'cajas abiertas' }}
    </template>

    <CashTable :min-width="850">
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
            <CashLinkButton @click="emit('open', session)">
              {{ session.id === myOpenSessionId ? 'Ver mi caja' : 'Ver caja' }}
            </CashLinkButton>
          </td>
        </tr>
      </tbody>
    </CashTable>
  </CajaPanel>
</template>

<style scoped>
.open-overview {
  margin-bottom: 20px;
}

/* Esta tabla es más estrecha que la del historial y sus dos columnas de texto
   no deben partirse. Es lo único que la separa de la base compartida. */
.duration,
.employee {
  white-space: nowrap;
}
</style>

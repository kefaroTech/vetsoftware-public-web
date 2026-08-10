<script setup lang="ts">
import {
  formatDateTime,
  formatMoney,
  isInflow,
  methodLabel,
  movementTypeLabel,
} from '../composables/useCaja'
import type { CashMovementView } from '../types/caja'

/**
 * Tabla de movimientos de una sesión de caja.
 *
 * Estaba escrita dos veces en `CajaView` con el mismo marcado carácter por
 * carácter — una para la caja propia y otra dentro del modal de detalle. Lo
 * único que cambiaba era el texto del estado vacío, así que va por prop.
 */
defineProps<{
  movements: CashMovementView[]
  emptyLabel: string
}>()
</script>

<template>
  <div class="table-scroll">
    <table class="movs movements-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo</th>
          <th>Medio</th>
          <th class="num">Monto</th>
          <th>Referencia</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="movements.length === 0">
          <td colspan="6" class="empty-row">{{ emptyLabel }}</td>
        </tr>
        <tr v-for="m in movements" :key="m.id ?? m.createdAt + m.type + m.method">
          <td>{{ formatDateTime(m.createdAt) }}</td>
          <td>{{ movementTypeLabel(m.type) }}</td>
          <td>{{ methodLabel(m.method) }}</td>
          <td class="num" :class="isInflow(m.type) ? 'pos' : 'neg'">
            {{ isInflow(m.type) ? '+' : '−' }}{{ formatMoney(m.amount) }}
          </td>
          <td>{{ m.referenceId ? m.referenceType + ' #' + m.referenceId : '—' }}</td>
          <td>{{ m.note ?? '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/* Base de tabla copiada de `CajaView`: el CSS scoped no cruza la frontera del
   componente y las otras tablas de caja siguen usando la suya. */
.table-scroll {
  width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
}

.movements-table {
  min-width: 760px;
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

.pos {
  color: #2f7d4f;
  font-weight: 600;
}

.neg {
  color: #b4453a;
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: var(--warm-400);
  padding: 22px;
}
</style>

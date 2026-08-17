<script setup lang="ts">
import CashTable from './CashTable.vue'
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
  <CashTable :min-width="760">
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Tipo</th>
        <th>Medio</th>
        <th class="ds-num">Monto</th>
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
        <td class="ds-num" :class="isInflow(m.type) ? 'ds-amount--pos' : 'ds-amount--neg'">
          {{ isInflow(m.type) ? '+' : '−' }}{{ formatMoney(m.amount) }}
        </td>
        <td>{{ m.referenceId ? m.referenceType + ' #' + m.referenceId : '—' }}</td>
        <td>{{ m.note ?? '—' }}</td>
      </tr>
    </tbody>
  </CashTable>
</template>

<style scoped>
/* El signo del importe es `.ds-amount--pos` / `--neg` (primitives.css). El
   positivo coincide entero; el negativo de la primitiva es SÓLO color, así que
   el peso —que esta tabla y el arqueo de `CloseCashModal` sí declaran— se queda
   como único residuo. Anotado en el informe FE-08: la primitiva da por hecho
   que el negativo no lleva peso, y en `caja` sus dos consumidores reales sí. */
.ds-amount--neg {
  font-weight: 600;
}
</style>

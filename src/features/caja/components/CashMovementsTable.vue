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
  </CashTable>
</template>

<style scoped>
/* El signo del importe. Mismo par que el arqueo de `CloseCashModal`, pero allí
   vive en otra tabla; candidato a primitiva (ver informe FE-08). */
.pos {
  color: #2f7d4f;
  font-weight: 600;
}

.neg {
  color: #b4453a;
  font-weight: 600;
}
</style>

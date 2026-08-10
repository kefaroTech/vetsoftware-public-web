<script setup lang="ts">
import { Wallet } from 'lucide-vue-next'
import ModalShell from '@/features/dashboard/components/ui/ModalShell.vue'
import CashMovementsTable from './CashMovementsTable.vue'
import {
  branchLabel,
  employeeLabel,
  formatDateTime,
  formatDuration,
  formatMoney,
  methodLabel,
} from '../composables/useCaja'
import type { CashSessionView } from '../types/caja'

/**
 * Modal de sólo lectura con el detalle de una caja ajena (o propia ya cerrada).
 *
 * `summary` es la fila de la que se partió — trae los nombres de sede y empleado
 * que el detalle no siempre incluye; `detail` es la respuesta completa. Por eso
 * la cabecera y un par de campos leen de `summary` y el resto de `detail`, tal
 * como hacía el bloque original dentro de `CajaView`.
 */
defineProps<{
  open: boolean
  loading: boolean
  error: string | null
  summary: CashSessionView | null
  detail: CashSessionView | null
}>()

const emit = defineEmits<{ close: []; retry: [session: CashSessionView] }>()
</script>

<template>
  <ModalShell
    :open="open"
    title="Detalle de caja"
    :subtitle="
      summary
        ? branchLabel(summary.branchName, summary.branchId) + ' · Terminal ' + summary.terminal
        : undefined
    "
    :icon="Wallet"
    :width-vw="86"
    :height-vh="88"
    @close="emit('close')"
  >
    <template #body>
      <div v-if="loading" class="cash-detail-state">Cargando detalle de la caja…</div>

      <div v-else-if="error" class="cash-detail-state error">
        <p>{{ error }}</p>
        <button
          v-if="summary"
          type="button"
          class="ds-btn ds-btn--neutral ds-btn--strong"
          @click="emit('retry', summary)"
        >
          Reintentar
        </button>
      </div>

      <div v-else-if="detail && summary" class="cash-detail">
        <div class="cash-detail-grid">
          <div class="cash-detail-field">
            <span class="cash-detail-label">Sede</span>
            <strong>{{ branchLabel(summary.branchName, detail.branchId) }}</strong>
          </div>
          <div class="cash-detail-field">
            <span class="cash-detail-label">Terminal</span>
            <strong>{{ detail.terminal }}</strong>
          </div>
          <div class="cash-detail-field">
            <span class="cash-detail-label">Estado</span>
            <span class="pill" :class="detail.status === 'OPEN' ? 'open' : 'closed'">
              {{ detail.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}
            </span>
          </div>
          <div class="cash-detail-field">
            <span class="cash-detail-label">Responsable</span>
            <strong>
              {{ employeeLabel(summary.openedByEmployeeName, detail.openedByEmployeeId) }}
            </strong>
          </div>
          <div class="cash-detail-field">
            <span class="cash-detail-label">Apertura</span>
            <strong>{{ formatDateTime(detail.openedAt) }}</strong>
          </div>
          <div class="cash-detail-field">
            <span class="cash-detail-label">Tiempo abierta</span>
            <strong>{{ formatDuration(detail.openedAt, detail.closedAt) }}</strong>
          </div>
        </div>

        <h3 class="cash-detail-section-title">Dinero esperado</h3>
        <div class="totals cash-detail-totals">
          <div class="total-card base">
            <span class="lbl">Base inicial</span>
            <span class="val">{{ formatMoney(detail.openingFloat) }}</span>
          </div>
          <div v-for="total in detail.totals" :key="total.method" class="total-card">
            <span class="lbl">{{ methodLabel(total.method) }}</span>
            <span class="val">{{ formatMoney(total.expectedAmount) }}</span>
          </div>
        </div>

        <h3 class="cash-detail-section-title">Movimientos</h3>
        <CashMovementsTable
          :movements="detail.movements"
          empty-label="Esta caja aún no tiene movimientos."
        />
      </div>
    </template>

    <template #footer-actions>
      <button type="button" class="ds-btn ds-btn--neutral ds-btn--strong" @click="emit('close')">
        Cerrar
      </button>
    </template>
  </ModalShell>
</template>

<style scoped>
/* Sin override de `--ds-btn-solid-bg`: los dos botones de este modal son
   `--neutral`, así que el tono de caja no aplica aquí. */
.cash-detail-state {
  min-height: 220px;
  display: grid;
  place-content: center;
  gap: 12px;
  color: var(--warm-500);
  text-align: center;
}

.cash-detail-state.error {
  color: #b4453a;
}

.cash-detail-state p {
  margin: 0;
}

.cash-detail {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cash-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.cash-detail-field {
  min-height: 66px;
  padding: 12px 14px;
  border: 1px solid var(--warm-200);
  border-radius: 10px;
  background: var(--warm-50);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 5px;
  color: var(--warm-800);
  font-size: 13px;
}

.cash-detail-label {
  color: var(--warm-500);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.cash-detail-section-title {
  margin: 0 0 -8px;
  color: var(--warm-800);
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 400;
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

.totals {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.cash-detail-totals {
  margin-bottom: 0;
}

.total-card {
  background: var(--warm-100);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.total-card.base {
  background: var(--amatista-100, #efe6f7);
}

.total-card .lbl {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--warm-500);
}

.total-card .val {
  font-size: 18px;
  font-weight: 700;
  color: var(--warm-900);
}

@media (width <= 720px) {
  .cash-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
